interface MetricCardProps {
  title: string;
  value: string;
  icon: string;
}

export const MetricCard = ({ title, value, icon }: MetricCardProps) => (
  <div className="bg-background rounded-none p-4 text-center border-2 border-primary shadow-brutal-sm">
    <div className="text-2xl mb-2">{icon}</div>
    <div className="text-xl font-bold font-mono tracking-wider text-foreground">{value}</div>
    <div className="text-sm text-muted-foreground font-mono mt-1">{title}</div>
  </div>
);

interface ScoreCardProps {
  title: string;
  score: number;
  maxScore: number;
  description: string;
  isPercentage?: boolean;
}

export const ScoreCard = ({ 
  title, 
  score, 
  maxScore, 
  description, 
  isPercentage = false 
}: ScoreCardProps) => {
  const percentage = (score / maxScore) * 100;
  const displayValue = isPercentage ? `${Math.round(score)}%` : `${score}/${maxScore}`;
  
  return (
    <div className="bg-background rounded-none p-4 border-2 border-primary shadow-brutal-sm">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold font-mono uppercase tracking-wider text-foreground">{title}</h3>
        <span className="text-lg font-bold font-mono text-primary">{displayValue}</span>
      </div>
      <p className="text-sm text-muted-foreground font-mono mb-3">{description}</p>
      <div className="w-full bg-muted rounded-none h-3 border border-primary">
        <div 
          className="bg-primary h-full border-r-2 border-primary transition-all duration-300"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
};

interface InsightCardProps {
  title: string;
  items: string[];
  icon: string;
}

export const InsightCard = ({ title, items, icon }: InsightCardProps) => (
  <div className="bg-background rounded-none p-4 border-2 border-primary shadow-brutal-sm">
    <div className="flex items-center gap-2 mb-3 border-b border-primary pb-2">
      <span className="text-lg">{icon}</span>
      <h3 className="font-bold font-mono uppercase tracking-wider text-foreground">{title}</h3>
    </div>
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="text-sm text-muted-foreground font-mono flex items-start">
          <span className="mr-2 text-primary font-bold">{'>'}</span> 
          <span>{item}</span>
        </div>
      ))}
    </div>
  </div>
);

interface WarningCardProps {
  title: string;
  description: string;
  severity: number;
  examples?: any[];
  isGreenFlag?: boolean;
}

export const WarningCard = ({ 
  title, 
  description, 
  severity, 
  examples = [], 
  isGreenFlag = false 
}: WarningCardProps) => {
  const colorClass = isGreenFlag ? 'bg-card text-foreground' : 'bg-destructive text-destructive-foreground';
  
  return (
    <div className={`rounded-none p-4 border-2 border-primary shadow-brutal-sm ${colorClass}`}>
      <div className="flex justify-between items-center mb-2 pb-2 border-b-2 border-primary/20">
        <h3 className="font-bold font-mono uppercase tracking-wider">{title}</h3>
        <span className="text-sm font-bold font-mono">{severity}/10</span>
      </div>
      <p className="text-sm font-mono mt-2 mb-3 opacity-90">{description}</p>
      {examples.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold font-mono uppercase opacity-70">Examples:</p>
          {examples.slice(0, 2).map((example, index) => (
            <MessageExampleCard key={index} example={example} />
          ))}
        </div>
      )}
    </div>
  );
};

interface ComparisonCardProps {
  title: string;
  user1Name: string;
  user1Value: string;
  user2Name: string;
  user2Value: string;
  icon: string;
}

export const ComparisonCard = ({ 
  title, 
  user1Name, 
  user1Value, 
  user2Name, 
  user2Value, 
  icon 
}: ComparisonCardProps) => {
  const val1 = parseInt(user1Value) || 0;
  const val2 = parseInt(user2Value) || 0;
  const total = val1 + val2;
  const user1Percentage = total > 0 ? (val1 / total) * 100 : 50;
  
  return (
    <div className="bg-background rounded-none p-4 border-2 border-primary shadow-brutal-sm">
      <div className="flex items-center gap-2 mb-3 border-b-2 border-primary pb-2">
        <span className="text-lg">{icon}</span>
        <h3 className="font-bold font-mono uppercase tracking-wider text-foreground">{title}</h3>
      </div>
      <div className="flex justify-between items-center mb-3">
        <div className="text-left font-mono">
          <div className="text-sm font-bold uppercase text-foreground">{user1Name}</div>
          <div className="text-xs font-bold text-muted-foreground">{user1Value} ({Math.round(user1Percentage)}%)</div>
        </div>
        <div className="text-right font-mono">
          <div className="text-sm font-bold uppercase text-foreground">{user2Name}</div>
          <div className="text-xs font-bold text-muted-foreground">{user2Value} ({Math.round(100 - user1Percentage)}%)</div>
        </div>
      </div>
      <div className="w-full bg-muted border border-primary h-3 flex overflow-hidden">
        <div 
          className="bg-primary h-full border-r border-primary"
          style={{ width: `${user1Percentage}%` }}
        />
        <div 
          className="bg-card h-full"
          style={{ width: `${100 - user1Percentage}%` }}
        />
      </div>
    </div>
  );
};

interface MessageExampleCardProps {
  example: any;
}

export const MessageExampleCard = ({ example }: MessageExampleCardProps) => (
  <div className="bg-card rounded-none p-3 border-2 border-primary shadow-brutal-sm mt-2">
    <div className="flex justify-between items-center mb-2 pb-1 border-b-2 border-primary/20">
      <span className="text-xs font-bold font-mono tracking-widest uppercase text-primary">{example.sender}</span>
      <span className="text-xs font-mono text-muted-foreground">{example.timestamp}</span>
    </div>
    <p className="text-sm font-mono text-card-foreground">{example.contentSnippet || example.content}</p>
  </div>
);

interface TimelineCardProps {
  phases: any[];
}

export const TimelineCard = ({ phases }: TimelineCardProps) => {
  const getPhaseEmoji = (phase: string) => {
    const phaseEmojis: Record<string, string> = {
      'intro': '👋',
      'honeymoon': '💕',
      'drift': '🌊',
      'real talk': '💭',
      'dry spell': '🏜️',
      'rekindled': '🔥'
    };
    return phaseEmojis[phase?.toLowerCase()] || '📅';
  };

  return (
    <div className="bg-background rounded-none p-4 border-2 border-primary shadow-brutal-sm">
      <div className="flex items-center gap-2 mb-4 border-b-2 border-primary pb-2">
        <span className="text-lg">📈</span>
        <h3 className="font-bold font-mono uppercase text-foreground">Conversation Timeline</h3>
      </div>
      <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
        {phases.map((phase, index) => (
          <div key={index} className="flex items-center gap-3 relative z-10">
            <span className="text-lg bg-card border-2 border-primary w-10 h-10 flex items-center justify-center rounded-none shadow-brutal-sm">{getPhaseEmoji(phase.phase)}</span>
            <div className="flex-1 bg-card border-2 border-primary p-2 shadow-brutal-sm">
              <div className="text-sm font-bold font-mono uppercase text-foreground">{phase.phase}</div>
              <div className="text-xs font-mono text-muted-foreground mt-1">
                {phase.start} {phase.end && `- ${phase.end}`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface OverviewCardProps {
  emotionalContext: string;
  explanation: string;
}

export const OverviewCard = ({ emotionalContext, explanation }: OverviewCardProps) => (
  <div className="bg-card rounded-none p-5 border-2 border-primary shadow-brutal">
    <div className="flex items-center gap-2 mb-4 border-b border-primary pb-2">
      <span className="text-xl">✨</span>
      <h3 className="font-bold font-mono text-lg text-foreground uppercase tracking-wider">AI Overview</h3>
    </div>
    <div className="space-y-4">
      {emotionalContext && (
        <div className="bg-background border border-primary p-3 shadow-brutal-sm">
          <h4 className="text-sm font-bold font-mono uppercase text-foreground mb-1">Emotional Context</h4>
          <p className="text-sm text-muted-foreground font-mono leading-relaxed">{emotionalContext}</p>
        </div>
      )}
      {explanation && (
        <div className="bg-background border border-primary p-3 shadow-brutal-sm">
          <h4 className="text-sm font-bold font-mono uppercase text-foreground mb-1">Detailed Explanation</h4>
          <p className="text-sm text-muted-foreground font-mono leading-relaxed">{explanation}</p>
        </div>
      )}
    </div>
  </div>
); 