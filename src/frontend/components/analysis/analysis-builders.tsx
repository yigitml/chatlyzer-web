import { MetricCard, ScoreCard, InsightCard, WarningCard, ComparisonCard, MessageExampleCard, TimelineCard, OverviewCard } from "./analysis-cards";
import { getVibeEmoji, getSimpLevel, getGhostRiskLevel, getMainCharacterLevel, getEmotionalDepthLevel } from "@/shared/types/analysis";

// Analysis Builders
export const VibeCheckAnalysisBuilder = ({ data }: { data: any }) => {
  const overallVibe = data.overallVibe || 'neutral';
  const emojiScore = data.emojiScore || 0;
  const humorDetected = data.humorDetected || false;
  const keywords = data.keywords || [];
  const moodDescriptors = data.moodDescriptors || [];
  const messageRefs = data.messageRefs || [];

  return (
    <div className="space-y-4">
      {data.overview && (
        <OverviewCard 
          emotionalContext={data.overview.emotionalContext} 
          explanation={data.overview.explanation} 
        />
      )}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard 
          title="Overall Vibe" 
          value={overallVibe.charAt(0).toUpperCase() + overallVibe.slice(1)} 
          icon={getVibeEmoji(overallVibe)} 
        />
        <MetricCard 
          title="Humor Detected" 
          value={humorDetected ? "Yes" : "No"} 
          icon={humorDetected ? "😂" : "😐"} 
        />
      </div>
      
      <ScoreCard
        title="Emoji Score"
        score={emojiScore}
        maxScore={10}
        description="How expressive is the conversation"
      />
      
      {keywords.length > 0 && (
        <InsightCard title="Keywords" items={keywords} icon="🔑" />
      )}
      
      {moodDescriptors.length > 0 && (
        <InsightCard title="Mood Descriptors" items={moodDescriptors} icon="🎭" />
      )}
      
      {messageRefs.slice(0, 3).map((ref: any, index: number) => (
        <MessageExampleCard key={index} example={ref} />
      ))}
    </div>
  );
};

export const RedFlagAnalysisBuilder = ({ data }: { data: any }) => {
  const flags = data.flags || [];
  
  return (
    <div className="space-y-4">
      {data.overview && (
        <OverviewCard 
          emotionalContext={data.overview.emotionalContext} 
          explanation={data.overview.explanation} 
        />
      )}
      <MetricCard 
        title="Red Flags Detected" 
        value={flags.length.toString()} 
        icon="🚩" 
      />
      
      {flags.map((flag: any, index: number) => (
        <WarningCard
          key={index}
          title={flag.label || 'Unknown Flag'}
          description={flag.explanation || ''}
          severity={flag.severity || 0}
          examples={flag.messageRefs || []}
          isGreenFlag={false}
        />
      ))}
    </div>
  );
};

export const GreenFlagAnalysisBuilder = ({ data }: { data: any }) => {
  const traits = data.traits || [];
  
  return (
    <div className="space-y-4">
      {data.overview && (
        <OverviewCard 
          emotionalContext={data.overview.emotionalContext} 
          explanation={data.overview.explanation} 
        />
      )}
      <MetricCard 
        title="Green Flags Detected" 
        value={traits.length.toString()} 
        icon="✅" 
      />
      
      {traits.map((trait: any, index: number) => (
        <WarningCard
          key={index}
          title={trait.label || 'Unknown Trait'}
          description={trait.explanation || ''}
          severity={trait.positivityScore || 0}
          examples={trait.messageRefs || []}
          isGreenFlag={true}
        />
      ))}
    </div>
  );
};

export const SimpOMeterAnalysisBuilder = ({ data }: { data: any }) => {
  const simpScore = data.simpScore || 0;
  const behaviors = data.behaviorsDetected || [];
  const messageRefs = data.messageRefs || [];

  return (
    <div className="space-y-4">
      {data.overview && (
        <OverviewCard 
          emotionalContext={data.overview.emotionalContext} 
          explanation={data.overview.explanation} 
        />
      )}
      <ScoreCard
        title="Simp Score"
        score={simpScore}
        maxScore={10}
        description={getSimpLevel(simpScore)}
      />
      
      {behaviors.length > 0 && (
        <InsightCard title="Behaviors Detected" items={behaviors} icon="🎭" />
      )}
      
      {messageRefs.slice(0, 3).map((ref: any, index: number) => (
        <MessageExampleCard key={index} example={ref} />
      ))}
    </div>
  );
};

export const GhostRiskAnalysisBuilder = ({ data }: { data: any }) => {
  const riskLevel = data.riskLevel || 'unknown';
  const riskScore = data.riskScore || 0;
  const signals = data.signals || [];

  return (
    <div className="space-y-4">
      {data.overview && (
        <OverviewCard 
          emotionalContext={data.overview.emotionalContext} 
          explanation={data.overview.explanation} 
        />
      )}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard 
          title="Risk Level" 
          value={getGhostRiskLevel(riskLevel)} 
          icon="👻" 
        />
        <MetricCard 
          title="Risk Score" 
          value={`${Math.round(riskScore)}/10`} 
          icon="📊" 
        />
      </div>
      
      {signals.map((signal: any, index: number) => (
        <WarningCard
          key={index}
          title={signal.label || 'Unknown Signal'}
          description={signal.explanation || ''}
          severity={riskScore}
          examples={signal.messageRefs || []}
          isGreenFlag={false}
        />
      ))}
    </div>
  );
};

export const MainCharacterEnergyAnalysisBuilder = ({ data }: { data: any }) => {
  const mceScore = data.mceScore || 0;
  const traits = data.traits || [];
  const standoutMoments = data.standoutMoments || [];

  return (
    <div className="space-y-4">
      {data.overview && (
        <OverviewCard 
          emotionalContext={data.overview.emotionalContext} 
          explanation={data.overview.explanation} 
        />
      )}
      <ScoreCard
        title="Main Character Energy"
        score={mceScore}
        maxScore={10}
        description={getMainCharacterLevel(mceScore)}
      />
      
      {traits.length > 0 && (
        <InsightCard title="Dramatic Traits" items={traits} icon="🎭" />
      )}
      
      {standoutMoments.slice(0, 3).map((moment: any, index: number) => (
        <MessageExampleCard key={index} example={moment} />
      ))}
    </div>
  );
};

export const EmotionalDepthAnalysisBuilder = ({ data }: { data: any }) => {
  const depthScore = data.depthScore || 0;
  const topicsTouched = data.topicsTouched || [];
  const vulnerableMoments = data.vulnerableMoments || [];

  return (
    <div className="space-y-4">
      {data.overview && (
        <OverviewCard 
          emotionalContext={data.overview.emotionalContext} 
          explanation={data.overview.explanation} 
        />
      )}
      <ScoreCard
        title="Emotional Depth"
        score={depthScore}
        maxScore={10}
        description={getEmotionalDepthLevel(depthScore)}
      />
      
      {topicsTouched.length > 0 && (
        <InsightCard title="Topics Discussed" items={topicsTouched} icon="🧠" />
      )}
      
      {vulnerableMoments.map((moment: any, index: number) => (
        <div key={index} className="bg-background rounded-none p-4 border-2 border-primary shadow-brutal-sm">
          <h4 className="font-bold font-mono uppercase tracking-wider text-foreground mb-2">{moment.description}</h4>
          {moment.messageRefs?.slice(0, 2).map((ref: any, refIndex: number) => (
            <MessageExampleCard key={refIndex} example={ref} />
          ))}
        </div>
      ))}
    </div>
  );
};

export const ChatStatsAnalysisBuilder = ({ data }: { data: any }) => {
  const totals = data.totals || {};
  const vibeBalance = data.vibeBalance || {};
  const userRoles = data.userRoles || [];
  const initiatorStats = data.initiatorStats || {};
  const conversationPhases = data.conversationPhases || [];

  return (
    <div className="space-y-6">
      {data.overview && (
        <OverviewCard 
          emotionalContext={data.overview.emotionalContext} 
          explanation={data.overview.explanation} 
        />
      )}
      {/* Overview Section */}
      <div>
        <h3 className="text-lg font-bold font-mono uppercase tracking-wider text-card-foreground mb-3 flex items-center gap-2">
          <span>📊</span> Overview
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <MetricCard 
            title="Messages" 
            value={totals.messageCount?.toString() || "0"} 
            icon="💬" 
          />
          <MetricCard 
            title="Words" 
            value={totals.wordCount?.toString() || "0"} 
            icon="📝" 
          />
          <MetricCard 
            title="Emojis" 
            value={totals.emojiCount?.toString() || "0"} 
            icon="😊" 
          />
        </div>
      </div>

      {/* Balance Section */}
      {Object.keys(vibeBalance).length > 0 && (
        <div>
          <h3 className="text-lg font-bold font-mono uppercase tracking-wider text-card-foreground mb-3 flex items-center gap-2">
            <span>⚖️</span> Conversation Balance
          </h3>
          <div className="space-y-4">
            <ScoreCard
              title="Mutual Effort"
              score={vibeBalance.mutualEffortScore || 0}
              maxScore={10}
              description="Conversation energy balance"
            />
            <ScoreCard
              title="Emotional Balance"
              score={vibeBalance.emotionalBalance || 0}
              maxScore={10}
              description="Emotional sharing balance"
            />
            <ScoreCard
              title="Engagement Level"
              score={vibeBalance.dryVsJuicyRatio || 0}
              maxScore={100}
              description="% of engaging messages"
              isPercentage={true}
            />
          </div>
        </div>
      )}

      {/* User Comparison */}
      {totals.messagesPerUser && totals.messagesPerUser.length >= 2 && (
        <div>
          <h3 className="text-lg font-bold font-mono uppercase tracking-wider text-card-foreground mb-3 flex items-center gap-2">
            <span>👥</span> User Activity
          </h3>
          <div className="space-y-4">
            <ComparisonCard
              title="Messages Sent"
              user1Name={totals.messagesPerUser[0]?.username || "User 1"}
              user1Value={totals.messagesPerUser[0]?.messageCount?.toString() || "0"}
              user2Name={totals.messagesPerUser[1]?.username || "User 2"}
              user2Value={totals.messagesPerUser[1]?.messageCount?.toString() || "0"}
              icon="💬"
            />
            {totals.wordsPerUser && totals.wordsPerUser.length >= 2 && (
              <ComparisonCard
                title="Words Written"
                user1Name={totals.wordsPerUser[0]?.username || "User 1"}
                user1Value={totals.wordsPerUser[0]?.wordCount?.toString() || "0"}
                user2Name={totals.wordsPerUser[1]?.username || "User 2"}
                user2Value={totals.wordsPerUser[1]?.wordCount?.toString() || "0"}
                icon="📝"
              />
            )}
          </div>
        </div>
      )}

      {/* Behavior Insights */}
      {userRoles.length > 0 && (
        <div>
          <h3 className="text-lg font-bold font-mono uppercase tracking-wider text-card-foreground mb-3 flex items-center gap-2">
            <span>🎭</span> Behavior Insights
          </h3>
          <InsightCard
            title="User Personalities"
            items={userRoles.map((role: any) => 
              `${role.username}: ${role.role?.charAt(0).toUpperCase() + role.role?.slice(1) || 'Unknown'}`
            )}
            icon="🎭"
          />
        </div>
      )}

      {/* Initiator Stats */}
      {Object.keys(initiatorStats).length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <MetricCard 
            title="Conversation Starter" 
            value={initiatorStats.mostLikelyToStartConvo || "Unknown"} 
            icon="🚀" 
          />
          <MetricCard 
            title="Gets Ghosted Most" 
            value={initiatorStats.mostGhosted || "Unknown"} 
            icon="👻" 
          />
        </div>
      )}

      {/* Timeline */}
      {conversationPhases.length > 0 && (
        <div>
          <h3 className="text-lg font-bold font-mono uppercase tracking-wider text-card-foreground mb-3 flex items-center gap-2">
            <span>📈</span> Conversation Journey
          </h3>
          <TimelineCard phases={conversationPhases} />
        </div>
      )}
    </div>
  );
}; 