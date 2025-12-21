import React, { useEffect } from 'react';
import { ArrowLeft, CheckCircle, AlertCircle, Lightbulb } from 'lucide-react';
import { Logo } from '../components/Logo';
import { getBlogPost } from '../content/blog';

interface BlogPostProps {
  slug: string;
  onBack?: () => void;
}

export const BlogPost: React.FC<BlogPostProps> = ({ slug, onBack }) => {
  const content = getBlogPost(slug);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [slug]);

  if (!content) {
    return (
      <div className="min-h-screen w-full bg-[#030406] text-white font-sans">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-16">
          <h1 className="text-2xl font-bold mb-4">Post not found</h1>
          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#030406] text-white font-sans">
      {/* Header */}
      <div className="border-b border-white/5 bg-[#0A0C0E]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <Logo />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <article className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12">
        {/* Title */}
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
          {content.title}
        </h1>

        {/* Direct Answer Box - Optimized for AIO */}
        <div className="bg-gradient-to-r from-teal-500/20 via-cyan-500/20 to-blue-500/20 border-l-4 border-teal-400 rounded-lg p-6 md:p-8 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <div className="flex items-start gap-3 mb-3">
              <Lightbulb className="w-6 h-6 text-teal-400 flex-shrink-0 mt-1" />
              <h2 className="text-xl md:text-2xl font-semibold text-teal-400">
                Quick Answer
              </h2>
            </div>
            <p className="text-gray-200 text-lg leading-relaxed">
              {content.directAnswer}
            </p>
          </div>
        </div>

        {/* Step-by-Step Guide */}
        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-white">
            Step-by-Step Guide
          </h2>
          
          <div className="space-y-8">
            {content.steps.map((step) => (
              <div
                key={step.number}
                className="bg-[#0A0C0E]/60 backdrop-blur-xl border border-white/5 rounded-xl p-6 md:p-8 hover:border-teal-500/30 transition-colors"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 flex items-center justify-center font-bold text-lg">
                    {step.number}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl md:text-2xl font-semibold mb-3 text-white">
                      {step.title}
                    </h3>
                    <p className="text-gray-300 leading-relaxed mb-4">
                      {step.content}
                    </p>
                    
                    {step.tips && step.tips.length > 0 && (
                      <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-4 mt-4">
                        <h4 className="text-sm font-semibold text-teal-400 mb-2 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Pro Tips
                        </h4>
                        <ul className="space-y-2">
                          {step.tips.map((tip, index) => (
                            <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                              <span className="text-teal-400 mt-1">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Troubleshooting Section */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <AlertCircle className="w-6 h-6 text-orange-400" />
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              {content.troubleshooting.title}
            </h2>
          </div>
          
          <div className="space-y-4">
            {content.troubleshooting.problems.map((item, index) => (
              <div
                key={index}
                className="bg-[#0A0C0E]/60 backdrop-blur-xl border border-white/5 rounded-xl p-6 hover:border-orange-500/30 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-orange-400 mb-2">
                      {item.problem}
                    </h3>
                    <p className="text-gray-300 leading-relaxed">
                      {item.solution}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Conclusion */}
        {content.conclusion && (
          <section className="bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-blue-500/10 border border-teal-500/20 rounded-xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-semibold mb-4 text-teal-400">
              Conclusion
            </h2>
            <p className="text-gray-200 leading-relaxed text-lg">
              {content.conclusion}
            </p>
          </section>
        )}

        {/* CTA Section */}
        <div className="mt-12 bg-gradient-to-r from-teal-500/20 via-cyan-500/20 to-blue-500/20 border border-teal-500/30 rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to Create Your Meme Coin?
          </h2>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            Join thousands of creators using TokenClub—the most economical Solana token launchpad. 
            Start creating your token today for just 0.1 SOL.
          </p>
          {onBack && (
            <button
              onClick={onBack}
              className="px-8 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg font-semibold hover:from-teal-600 hover:to-cyan-600 transition-all transform hover:scale-105 shadow-lg shadow-teal-500/50"
            >
              Get Started Now
            </button>
          )}
        </div>
      </article>
    </div>
  );
};

