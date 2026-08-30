## What problem it solves

Phishing works because it looks ordinary. A message that says your account will
be suspended unless you confirm your details is indistinguishable, at a glance,
from a message a bank might genuinely send — and the person reading it is busy.

The Email Header Authentication chapter covers one half of the defence: proving
who sent it. This is the other half — **what does the text itself look like?**

The two are complementary. Authentication catches a spoofed sender and passes a
lookalike domain the attacker registered legitimately. Content analysis catches
the language of a scam regardless of who sent it, and passes a well-written
attack.

This tool classifies the **body text**, gives a probability, and — the part that
matters most — shows **which words drove the decision**.

It runs entirely in the browser. The model ships as a JSON file.

## The model or algorithm

### Multinomial Naive Bayes

A trained model, and one worth being able to derive rather than just name.

Bayes' theorem, applied to classification:

```
P(phishing | words) ∝ P(words | phishing) × P(phishing)
```

The **naive** assumption is that words are conditionally independent given the
class. That is obviously false — "account" and "suspended" co-occur far more
often than chance — but it makes `P(words | class)` factor into a product of
per-word probabilities, which is what makes the model trainable from modest data
and computable in a browser.

Working in log space turns the product into a sum, and the score becomes:

```
score(class) = log P(class) + Σ over words  count(w) × log P(w | class)
```

Which is a **dot product between a bag-of-words vector and a per-class weight
vector**. That is the whole classifier: two dot products, compare, done.

The implementation reproduces scikit-learn's `MultinomialNB.predict_log_proba()`
exactly, and a softmax over the two log-scores turns them into a displayable
0–1 probability.

### The tokenizer must match the training script exactly

The file leads with a warning that deserves repeating, because it describes a bug
class that produces **no error at all**:

> *Must exactly mirror the Python training script's tokenizer and stopword list —
> any mismatch here silently degrades the shipped model's real measured accuracy
> without any error being raised.*

A model trained in Python and served in TypeScript has its feature extraction
implemented **twice**. If the two disagree — a different stopword list, different
punctuation handling, a different minimum token length — the vectors at inference
time are not the vectors the weights were fitted on. Accuracy quietly drops and
every test still passes, because nothing is broken in a way software can detect.

So the TypeScript is written to match Python step for step, with the
correspondence documented:

- lowercase;
- strip exactly Python's `string.punctuation`, **with no replacement**, so
  `don't` becomes `dont` — concatenating across the removed character, as
  `str.translate` does;
- **digits are deliberately left alone**, because they act as natural boundaries
  for the `[a-z]+` match, exactly as Python's regex does on a
  punctuation-stripped but digit-preserving string;
- keep tokens longer than two characters that are not stopwords.

That level of care about a tokenizer looks fussy and is the difference between a
model that performs as measured and one that quietly does not. **Training-serving
skew is one of the most common and least visible failures in deployed machine
learning**, and the fix is exactly this: define the transformation once,
precisely, and verify both implementations agree.

### The measured accuracy

```
90.95% on a held-out set of 2,795 emails
```

Both numbers ship in the model JSON and are exported as constants, so the
interface quotes the measured figure rather than a remembered one. Vocabulary:
3,000 words.

### Explainability, for free

This is where Naive Bayes earns its place over something stronger.

For each word in the message, the tool computes:

```
delta = (log P(word | phishing) − log P(word | safe)) × count
```

That is **exactly how much that word moved the decision**, in the units the
decision is made in. Sort by absolute value, take the top eight, and you have a
faithful explanation — not an approximation of one.

Compare with the SHAP chapter, where explaining a gradient-boosted model requires
a separate algorithm, a separate library and a chapter of its own. Here the
model's structure *is* the explanation, because the score is a sum of independent
per-word contributions. **For a tool whose job is to teach someone what phishing
looks like, that is worth more than a few points of accuracy.**

### The rule-based signals, kept separate

Alongside the model, two curated lists:

**Urgency phrases** — *"act now"*, *"your account will be suspended"*, *"verify
immediately"*, *"final notice"*, *"unauthorized access detected"*.

**Generic greetings** — *"dear customer"*, *"dear valued customer"*, *"dear
account holder"*. A real bank knows your name; a bulk campaign does not.

These are **reported as signals, not folded into the score**. The framing is
named in the code as the same "signals not verdict" pattern as the QR detector's
brand list, and both lists are disclosed as small and non-exhaustive.

Keeping them separate is right: the model's probability stays a statement about
the model, and the rules stay human-readable observations a reader can judge for
themselves. Blending them would make the number harder to interpret and the rules
harder to disagree with.

## Why these choices

**Why Naive Bayes rather than a transformer.** Three reasons, in order of
importance for this tool. It is fully explainable, and explanation is the
product. It fits in a JSON file and runs instantly in a browser, so nothing is
uploaded. And on bag-of-words spam classification it is a genuinely strong
baseline — this is the task Naive Bayes was made famous by.

**Why the browser.** Emails are private. A phishing checker that requires you to
paste a suspicious email to a server has asked you to do the thing the tool is
meant to make you cautious about.

**Why 3,000 words.** Enough coverage to be accurate, small enough to ship as JSON
and keep the dot product trivial.

## How to read the output

- **Read the top words before the verdict.** They are the actual reasoning, and
  they tell you whether the model latched onto something meaningful or onto a
  quirk of its training data.
- **The probability is Naive Bayes' probability**, and NB is famously
  overconfident — the independence assumption multiplies correlated evidence as
  if it were independent, pushing scores toward 0 and 1. Read it as a ranking,
  not a calibrated likelihood.
- **Urgency phrases and generic greetings are separate findings.** A legitimate
  message can contain both.
- **A 91% accurate classifier is wrong about one email in eleven.**
- **Short messages are unreliable** — a handful of tokens is very little
  evidence.
- **The model saw a particular corpus.** Phishing in a style unlike its training
  data will be missed.

## Limits

- **90.95% held-out accuracy** — measured, stated, and not production-grade for
  automatic filtering.
- **Body text only.** No headers, no links, no attachments, no sender reputation.
  Real filters weight all of those heavily.
- **Bag of words.** Order and structure are discarded, so *"we will never ask you
  to verify your account"* and *"verify your account"* look similar.
- **The independence assumption is false**, which is why the probabilities are
  overconfident.
- **Vocabulary is fixed at 3,000 words**; anything outside it contributes
  nothing.
- **English only.**
- **Trained on one corpus**, with whatever era and style bias that carries.
- **Curated phrase lists**, disclosed as non-exhaustive.
- **Trivially evadable if you know the model** — the top words are shown, so an
  attacker could avoid them. That is an acceptable trade for a teaching tool and
  would not be for a filter.

## Likely interview questions

**"How does Naive Bayes work?"**
Bayes' theorem with a conditional-independence assumption between features. That
assumption lets `P(words | class)` factor into a product of per-word
probabilities, and in log space the product becomes a sum — so the score is the
class log-prior plus, for each word, its count times the log probability of that
word given the class. Two dot products, one per class, and you compare them. The
independence assumption is false for language, which is exactly why it is called
naive, and it works well anyway.

**"If the assumption is false, why does it work?"**
Because classification only needs the *ranking* of the two scores to be right,
not the probabilities. Correlated words cause the same evidence to be counted
several times, which inflates the magnitude of the winning score — but usually in
the direction it was already going. So the decision is often correct while the
probability is badly overconfident. That is why I would present the number as a
ranking rather than a calibrated likelihood.

**"You trained in Python and serve in TypeScript. What's the risk?"**
Training-serving skew. The feature extraction exists twice, and if the two
disagree in any detail — stopwords, punctuation handling, minimum token length —
the vectors at inference time are not the ones the weights were fitted on.
Accuracy degrades and **nothing raises an error**, which is what makes it
dangerous. The tokenizer here is written to mirror the Python step for step, down
to stripping punctuation with no replacement so `don't` becomes `dont`, and
leaving digits alone so they act as token boundaries the same way.

**"Why not a transformer? You'd get better accuracy."**
Probably several points better, and I would lose the thing the tool is for. The
explanation here is exact rather than approximate: the score is a sum of
independent per-word contributions, so "this word moved the decision by this
much" is arithmetic, not an attribution method. It also ships as a JSON file and
runs in the browser, so no one has to upload a private email. For a tool whose
job is to teach someone what phishing text looks like, explainability and privacy
beat a few points.

**"Your model shows the user which words triggered it. Doesn't that help
attackers?"**
Yes, and it is a deliberate trade. Showing the top words makes the tool
evadable — write a phishing email avoiding them and it scores lower. That is
unacceptable in a production filter and correct here, because this exists to
teach a person what to look for, not to block mail at a gateway. A real filter
would keep its features private and lean on headers, link reputation and sender
history, none of which are visible to the person writing the email.
