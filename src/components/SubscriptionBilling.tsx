import React, { useState, useEffect } from 'react';
import { CreditCard, Check, Zap, Shield, Star, ArrowUpRight, Clock, MessageSquare, AlertCircle } from 'lucide-react';
import { BACKEND_URL } from '../services/env';

export default function SubscriptionBilling() {
  const [currentPlan, setCurrentPlan] = useState('starter');
  const [messagesUsed, setMessagesUsed] = useState(140);
  const [monthlyLimit, setMonthlyLimit] = useState(1000);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Read from DB or organization
    const fetchUsage = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          const res = await fetch(`${BACKEND_URL}/api/settings/ai-config`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.subscription_plan) setCurrentPlan(data.subscription_plan);
            if (data.messages_used_this_month !== undefined) setMessagesUsed(data.messages_used_this_month);
            if (data.monthly_message_limit !== undefined) setMonthlyLimit(data.monthly_message_limit);
          }
        }
      } catch (err) {
        console.error('Failed to fetch subscription usage:', err);
      }
    };
    fetchUsage();
  }, []);

  const usagePercent = Math.min(100, Math.round((messagesUsed / monthlyLimit) * 100));

  const plans = [
    {
      id: 'starter',
      name: 'Starter Concierge',
      price: '₦35,000',
      period: '/ month',
      description: 'Ideal for single-location businesses, boutique stores, and salons.',
      quota: '1,000 AI messages / mo',
      features: [
        'Embeddable Web Chat Widget',
        'Zero Meta setup needed',
        'Built-in Catalog (up to 50 items)',
        'Standard booking scheduler',
        'Email & community support'
      ],
      popular: false
    },
    {
      id: 'growth',
      name: 'Growth & Omnichannel',
      price: '₦95,000',
      period: '/ month',
      description: 'For growing businesses, clinics, and churches needing WhatsApp + Web.',
      quota: '5,000 AI messages / mo',
      features: [
        'Web Widget + WhatsApp Cloud API',
        'WhatsApp Bridge & QR code pairing',
        'Voice Note speech transcription (Whisper)',
        'Unlimited catalog items',
        'Live Chats human takeover dashboard',
        'Priority support'
      ],
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise & Marketplace',
      price: '₦250,000',
      period: '/ month',
      description: 'For platforms like Rentigram, real estate firms, and multi-location fleets.',
      quota: 'Unlimited / Custom quota',
      features: [
        'External API Webhook live inventory sync',
        'Sub-second car/property database queries',
        'Custom AI voice cloning integration',
        'WhatsApp Groups auto-welcome & blast',
        'Dedicated account manager',
        'Custom domain SLA & 99.9% uptime'
      ],
      popular: false
    }
  ];

  const handleUpgrade = (planId: string) => {
    alert(`Upgrading to ${planId.toUpperCase()} plan. This opens your Paystack secure recurring payment link!`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center gap-2.5">
          <CreditCard className="text-teal-600" />
          Subscription & Usage
        </h2>
        <p className="text-slate-500 text-sm sm:text-base mt-1">
          Manage your organization plan, monthly message quotas, and recurring billing.
        </p>
      </div>

      {/* Usage Meter Card */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Month Usage</span>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {messagesUsed.toLocaleString()} <span className="text-sm font-normal text-slate-500">/ {monthlyLimit.toLocaleString()} AI messages used</span>
            </div>
          </div>
          <span className="bg-teal-50 text-teal-700 text-xs font-bold px-3 py-1.5 rounded-full self-start sm:self-auto uppercase">
            Active Plan: {currentPlan}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              usagePercent > 85 ? 'bg-amber-500' : 'bg-teal-500'
            }`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-xs text-slate-400">
          <span>Resets on the 1st of every month</span>
          <span>{monthlyLimit - messagesUsed > 0 ? `${(monthlyLimit - messagesUsed).toLocaleString()} messages remaining` : 'Quota limit reached'}</span>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        {plans.map((p) => {
          const isCurrent = currentPlan === p.id;
          return (
            <div
              key={p.id}
              className={`bg-white rounded-2xl border p-6 flex flex-col justify-between transition-all relative ${
                p.popular
                  ? 'border-teal-500 shadow-lg ring-2 ring-teal-500/20'
                  : 'border-slate-100 shadow-sm hover:shadow-md'
              }`}
            >
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-xs">
                  Most Popular
                </span>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{p.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{p.description}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-slate-900">{p.price}</span>
                  <span className="text-xs text-slate-400">{p.period}</span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl text-xs font-semibold text-teal-700 flex items-center gap-2">
                  <MessageSquare size={14} />
                  {p.quota}
                </div>

                <ul className="space-y-2.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  {p.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check size={14} className="text-teal-600 mt-0.5 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleUpgrade(p.id)}
                  disabled={isCurrent}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-slate-100 text-slate-400 cursor-default'
                      : p.popular
                      ? 'bg-teal-500 hover:bg-teal-600 text-white shadow-xs active:scale-98'
                      : 'bg-slate-900 hover:bg-slate-800 text-white active:scale-98'
                  }`}
                >
                  {isCurrent ? 'Current Plan' : 'Select Plan'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
