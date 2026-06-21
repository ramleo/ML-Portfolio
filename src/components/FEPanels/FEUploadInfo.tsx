"use client";

import DatasetEstimator from "@/components/DatasetEstimator";

interface FEUploadInfoProps {
  rowCount: number;
  numericColCount: number;
  ldaEnabled: boolean;
  ldaTopics: number;
  ldaIter: number;
}

export default function FEUploadInfo({
  rowCount,
  numericColCount,
  ldaEnabled,
  ldaTopics,
  ldaIter,
}: FEUploadInfoProps) {
  if (rowCount === 0) return null;
  return (
    <DatasetEstimator
      n={rowCount}
      p={numericColCount}
      tool="fe"
      ldaEnabled={ldaEnabled}
      ldaTopics={ldaTopics}
      ldaIter={ldaIter}
    />
  );
}
