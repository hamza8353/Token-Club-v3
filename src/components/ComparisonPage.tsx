import React, { useEffect } from 'react';
import { Check, X, DollarSign, ArrowLeft } from 'lucide-react';
import { Logo } from '../components/Logo';

interface ComparisonPageProps {
  onBack: () => void;
}

export const ComparisonPage: React.FC<ComparisonPageProps> = ({ onBack }) => {
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#030406] text-white font-sans">
      {/* Header */}
      <div className="border-b border-white/5 bg-[#0A0C0E]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <Logo />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        {/* H1 Heading */}
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-center bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
          Smithii vs TokenClub: The Cheapest Solana Token Creator (2025)
        </h1>

        {/* SEO Description */}
        <p className="text-center text-gray-400 mb-12 text-lg max-w-3xl mx-auto">
          Discover why TokenClub is the most <strong className="text-teal-400">economical Solana token launchpad</strong> in 2025. 
          Compare pricing, features, and value across the top Solana token creation platforms.
        </p>

        {/* Comparison Table */}
        <div className="bg-[#0A0C0E]/60 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl overflow-hidden mb-12">
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="px-4 md:px-6 py-4 text-left text-xs md:text-sm font-semibold uppercase tracking-wider text-gray-300">
                    Feature
                  </th>
                  <th className="px-4 md:px-6 py-4 text-center text-xs md:text-sm font-semibold uppercase tracking-wider text-teal-400">
                    TokenClub
                  </th>
                  <th className="px-4 md:px-6 py-4 text-center text-xs md:text-sm font-semibold uppercase tracking-wider text-gray-400">
                    Smithii
                  </th>
                  <th className="px-4 md:px-6 py-4 text-center text-xs md:text-sm font-semibold uppercase tracking-wider text-gray-400">
                    Orion Tools
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {/* Base Token Cost */}
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="px-4 md:px-6 py-4 text-xs md:text-sm font-medium text-gray-300">
                    Base Token Cost
                  </td>
                  <td className="px-4 md:px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-2 text-teal-400 font-semibold">
                      <Check className="w-5 h-5" />
                      0.1 SOL
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-2 text-red-400">
                      <DollarSign className="w-5 h-5" />
                      <span className="text-gray-400">0.3 SOL</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-2 text-red-400">
                      <DollarSign className="w-5 h-5" />
                      <span className="text-gray-400">0.3+ SOL</span>
                    </span>
                  </td>
                </tr>

                {/* Revoke Authority Cost */}
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="px-4 md:px-6 py-4 text-xs md:text-sm font-medium text-gray-300">
                    Revoke Authority Cost
                  </td>
                  <td className="px-4 md:px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-2 text-teal-400 font-semibold">
                      <Check className="w-5 h-5" />
                      0.1 SOL
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-2 text-red-400">
                      <DollarSign className="w-5 h-5" />
                      <span className="text-gray-400">0.2 SOL</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-2 text-red-400">
                      <DollarSign className="w-5 h-5" />
                      <span className="text-gray-400">0.2+ SOL</span>
                    </span>
                  </td>
                </tr>

                {/* Vanity Address */}
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="px-4 md:px-6 py-4 text-xs md:text-sm font-medium text-gray-300">
                    Vanity Address
                  </td>
                  <td className="px-4 md:px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-2 text-teal-400 font-semibold">
                      <Check className="w-5 h-5" />
                      Included
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-2 text-red-400">
                      <X className="w-5 h-5" />
                      <span className="text-gray-400">Extra Cost</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-2 text-red-400">
                      <X className="w-5 h-5" />
                      <span className="text-gray-400">Extra Cost</span>
                    </span>
                  </td>
                </tr>

                {/* Volume Bot Availability */}
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="px-4 md:px-6 py-4 text-xs md:text-sm font-medium text-gray-300">
                    Volume Bot Availability
                  </td>
                  <td className="px-4 md:px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-2 text-teal-400 font-semibold">
                      <Check className="w-5 h-5" />
                      YES
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-2 text-red-400">
                      <X className="w-5 h-5" />
                      <span className="text-gray-400">No</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-2 text-red-400">
                      <X className="w-5 h-5" />
                      <span className="text-gray-400">No</span>
                    </span>
                  </td>
                </tr>

                {/* Trust Pilot Score */}
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="px-4 md:px-6 py-4 text-xs md:text-sm font-medium text-gray-300">
                    Trust Pilot Score
                  </td>
                  <td className="px-4 md:px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-2 text-teal-400 font-semibold">
                      <Check className="w-5 h-5" />
                      4.9/5
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-gray-400">N/A</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-gray-400">N/A</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="space-y-6 mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
            Frequently Asked Questions
          </h2>

          {/* FAQ 1 */}
          <div className="bg-[#0A0C0E]/60 backdrop-blur-xl border border-white/5 rounded-xl p-6 md:p-8">
            <h3 className="text-xl font-semibold mb-3 text-teal-400">
              Why is TokenClub cheaper than Orion Tools?
            </h3>
            <p className="text-gray-300 leading-relaxed">
              TokenClub operates as the most <strong className="text-teal-400">economical Solana token launchpad</strong> by 
              optimizing our smart contract infrastructure and reducing overhead costs. We pass these savings directly to our users, 
              offering base token creation at just 0.1 SOL compared to Orion Tools&apos; 0.3+ SOL pricing. Our streamlined platform 
              eliminates unnecessary fees while maintaining enterprise-grade security and functionality. Additionally, features like 
              vanity addresses and volume bot integration are included at no extra cost, making TokenClub the best value proposition 
              for Solana token creators in 2025.
            </p>
          </div>

          {/* FAQ 2 */}
          <div className="bg-[#0A0C0E]/60 backdrop-blur-xl border border-white/5 rounded-xl p-6 md:p-8">
            <h3 className="text-xl font-semibold mb-3 text-teal-400">
              Is it safe to use a cheap Solana launchpad?
            </h3>
            <p className="text-gray-300 leading-relaxed">
              Absolutely. TokenClub&apos;s lower pricing doesn&apos;t compromise security or functionality. We&apos;ve built our platform on 
              proven Solana smart contracts and maintain a 4.9/5 Trust Pilot rating with 100+ successful token launches. Our 
              <strong className="text-teal-400"> economical Solana token launchpad</strong> uses the same underlying technology 
              as more expensive platforms, but with optimized fee structures. All transactions are on-chain and verifiable, 
              and we provide full transparency with our platform fees stored on-chain within pool states. Lower cost doesn&apos;t 
              mean lower quality—it means better value through efficient engineering.
            </p>
          </div>

          {/* FAQ 3 */}
          <div className="bg-[#0A0C0E]/60 backdrop-blur-xl border border-white/5 rounded-xl p-6 md:p-8">
            <h3 className="text-xl font-semibold mb-3 text-teal-400">
              How to migrate from Smithii to TokenClub?
            </h3>
            <p className="text-gray-300 leading-relaxed">
              Migrating from Smithii to TokenClub is straightforward. If you&apos;re creating a new token, simply use TokenClub&apos;s 
              platform—you&apos;ll save 0.2 SOL on base creation and 0.1 SOL on authority revocation. For existing tokens, you can 
              use TokenClub&apos;s liquidity management, swap, and portfolio tools without any migration needed. Our platform is 
              compatible with all standard SPL tokens created on Solana. Simply connect your wallet and start using our 
              <strong className="text-teal-400"> economical Solana token launchpad</strong> features immediately. No data 
              export or complex setup required—just connect and go.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-teal-500/20 via-cyan-500/20 to-blue-500/20 border border-teal-500/30 rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to Create Your Token?
          </h2>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            Join thousands of creators using the most <strong className="text-teal-400">economical Solana token launchpad</strong>. 
            Start creating your token today for just 0.1 SOL.
          </p>
          <button
            onClick={onBack}
            className="px-8 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg font-semibold hover:from-teal-600 hover:to-cyan-600 transition-all transform hover:scale-105 shadow-lg shadow-teal-500/50"
          >
            Get Started Now
          </button>
        </div>
      </div>
    </div>
  );
};

