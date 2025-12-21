import React from 'react';
import { Input } from '../components/ui/Input';
import { Section } from '../components/ui/Section';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { Slider } from '../components/ui/Slider';

const RemoveModule = React.memo(() => (
  <div className="max-w-2xl animate-in slide-in-from-right-8 duration-500">
    <div className="bg-[#050508]/80 border border-white/10 rounded-3xl p-8 space-y-8 border-t-4 border-t-red-500 spotlight-card">
      <Section title="Withdraw Liquidity" desc="Remove SOL and Token from AMM." />
      <Input label="Pool ID" placeholder="Enter AMM ID" />
      <Slider label="Withdrawal %" danger />
      <PrimaryButton text="Confirm Withdrawal" cost="Gas Only" color="red" />
    </div>
  </div>
));
RemoveModule.displayName = 'RemoveModule';

export default RemoveModule;

