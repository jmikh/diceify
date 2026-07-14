import { PlanType } from '@/lib/subscription'

// Small pill showing the user's subscription tier, shared by the desktop
// user menu and the mobile menu
export default function PlanBadge({ planType }: { planType: PlanType }) {
    switch (planType) {
        case 'lifetime':
            return <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30">LIFETIME</span>
        case 'studio':
            return <span className="px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-400 text-[10px] font-bold border border-pink-500/30">STUDIO</span>
        case 'creator':
            return <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold border border-blue-500/30">CREATOR PASS</span>
        default:
            return <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-white/60 text-[10px] font-bold border border-white/20">EXPLORER</span>
    }
}
