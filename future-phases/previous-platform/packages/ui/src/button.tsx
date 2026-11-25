// Customized shadcn/ui button pattern, MIT. See THIRD_PARTY_NOTICES.md.
import {Slot} from '@radix-ui/react-slot';
import {cva,type VariantProps} from 'class-variance-authority';
import type {ComponentProps} from 'react';
import {cn} from './utils';
const variants=cva('inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:pointer-events-none disabled:opacity-50 min-h-11 px-4', {variants:{variant:{default:'bg-teal-800 text-white hover:bg-teal-900',outline:'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50',ghost:'text-slate-700 hover:bg-slate-100'}},defaultVariants:{variant:'default'}});
export function Button({className,variant,asChild=false,...props}:ComponentProps<'button'>&VariantProps<typeof variants>&{asChild?:boolean}){const Comp=asChild?Slot:'button';return <Comp className={cn(variants({variant,className}))} {...props}/>;}
