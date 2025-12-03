"use client";

import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/frontend/components/ui/dialog";
import { Button } from "@/frontend/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/frontend/components/ui/card";
import type { Chat, Analysis } from "../../../generated/client/browser";
import { AnalysisResultCard } from "@/frontend/components/analysis/analysis-result-card";
import { AnalysisType } from "@/shared/types/api/apiRequest";
import { normalizeAnalysisType } from "@/shared/types/analysis";

interface GhostResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: { chat: Chat; analyses: Analysis[] } | null;
}

export const GhostResultsModal = ({ isOpen, onClose, result }: GhostResultsModalProps) => {
  if (!result) return null;

  // Group analyses by normalized type for display
  const analysesByType = result.analyses.reduce((acc, analysis) => {
    try {
      const resultData = typeof analysis.result === 'string' ? JSON.parse(analysis.result) : analysis.result;
      const rawType = resultData?.type || resultData?.analysisType;
      if (rawType) {
        const normalized = normalizeAnalysisType(rawType);
        if (normalized) acc[normalized as AnalysisType] = analysis;
      }
    } catch {}
    return acc;
  }, {} as Record<AnalysisType, Analysis>);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] bg-black border-white/20 text-white max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Ghost Analysis Results</DialogTitle>
          <DialogDescription className="text-white/60">
            These results are not saved. Close this dialog to discard them.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-base">{result.chat.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/60 text-sm">Participants: {Array.isArray(result.chat.participants) ? result.chat.participants.join(", ") : ''}</p>
            </CardContent>
          </Card>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {Object.entries(analysesByType).map(([type, analysis]) => (
              <AnalysisResultCard key={type} analysis={analysis} />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};


