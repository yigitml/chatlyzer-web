interface MetricCardProps {
  title: string;
  value: string;
  icon: string;
}

export const MetricCard = ({ title, value, icon }: MetricCardProps) => (
  <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
    <div className="text-2xl mb-2">{icon}</div>
    <div className="text-xl font-bold text-white">{value}</div>
    <div className="text-sm text-white/60">{title}</div>
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
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-white">{title}</h3>
        <span className="text-lg font-bold text-purple-400">{displayValue}</span>
      </div>
      <p className="text-sm text-white/60 mb-3">{description}</p>
      <div className="w-full bg-white/10 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
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
  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
    <div className="flex items-center gap-2 mb-3">
      <span className="text-lg">{icon}</span>
      <h3 className="font-semibold text-white">{title}</h3>
    </div>
    <div className="space-y-1">
      {items.map((item, index) => (
        <div key={index} className="text-sm text-white/80">• {item}</div>
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
  const colorClass = isGreenFlag ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10';
  const textColorClass = isGreenFlag ? 'text-green-300' : 'text-red-300';
  
  return (
    <div className={`rounded-xl p-4 border ${colorClass}`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className={`font-bold ${textColorClass}`}>{title}</h3>
        <span className={`text-sm font-bold ${textColorClass}`}>{severity}/10</span>
      </div>
      <p className="text-white/80 text-sm mb-3">{description}</p>
      {examples.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-white/60">Examples:</p>
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
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{icon}</span>
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
      <div className="flex justify-between items-center mb-3">
        <div className="text-left">
          <div className="text-sm font-medium text-white">{user1Name}</div>
          <div className="text-xs text-purple-400">{user1Value} ({Math.round(user1Percentage)}%)</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-white">{user2Name}</div>
          <div className="text-xs text-pink-400">{user2Value} ({Math.round(100 - user1Percentage)}%)</div>
        </div>
      </div>
      <div className="w-full bg-white/10 rounded-full h-2 flex overflow-hidden">
        <div 
          className="bg-purple-500 h-full"
          style={{ width: `${user1Percentage}%` }}
        />
        <div 
          className="bg-pink-500 h-full"
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
  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
    <div className="flex justify-between items-center mb-1">
      <span className="text-xs font-medium text-purple-300">{example.sender}</span>
      <span className="text-xs text-white/40">{example.timestamp}</span>
    </div>
    <p className="text-sm text-white/80">{example.contentSnippet || example.content}</p>
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
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">📈</span>
        <h3 className="font-semibold text-white">Conversation Timeline</h3>
      </div>
      <div className="space-y-3">
        {phases.map((phase, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="text-lg">{getPhaseEmoji(phase.phase)}</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-white">{phase.phase}</div>
              <div className="text-xs text-white/60">
                {phase.start} {phase.end && `- ${phase.end}`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 