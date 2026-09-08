import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Car,
  Building2,
  Stethoscope,
  ShoppingBag,
  Church,
  ArrowRight,
  CheckCircle2,
  Code2,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Star,
  ExternalLink,
  Layers,
  Database,
  Smartphone,
  Send,
  Users,
  CalendarCheck,
  RefreshCw,
  Clock
} from 'lucide-react';
import logoImage from '../logo.png';

interface LandingPageProps {
  onOpenAuth: (view: 'login' | 'register') => void;
}

interface DemoScenario {
  id: string;
  name: string;
  industry: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  prompt: string;
  visitorMessage: string;
  aiReply: string;
  card?: {
    title: string;
    subtitle: string;
    price: string;
    image: string;
    specs: string[];
    actionText: string;
  };
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'rentals',
    name: 'Car Rental & Fleet',
    industry: 'Automotive',
    icon: Car,
    prompt: 'Rent an SUV in Lagos',
    visitorMessage: "Hi, I need a luxury SUV for a 3-day corporate trip in Lekki, starting tomorrow. Do you have anything available?",
    aiReply: "Hello! Absolutely. We have two premium SUVs ready for delivery in Lekki tomorrow morning. Here is our most popular option with full comprehensive insurance and optional chauffeur service:",
    card: {
      title: "Mercedes-Benz G63 AMG (2023)",
      subtitle: "Luxury SUV • Chauffeur or Self-Drive",
      price: "₦350,000 / day",
      image: "https://images.unsplash.com/photo-1520031441872-265e4ff70366?auto=format&fit=crop&w=600&q=80",
      specs: ["V8 Biturbo", "Security Escort Ready", "Full Air-Conditioning", "Lekki / VI Delivery"],
      actionText: "Reserve G-Wagon"
    }
  },
  {
    id: 'shortlets',
    name: 'Real Estate & Shortlets',
    industry: 'Hospitality',
    icon: Building2,
    prompt: 'Book Victoria Island Penthouse',
    visitorMessage: "Good day! Looking for a 2-bedroom luxury penthouse in Victoria Island with 24/7 power and ocean view for next weekend.",
    aiReply: "Welcome! We have the perfect serviced apartment available for next weekend. It comes with 24/7 uninterrupted power, high-speed fiber internet, and a private rooftop terrace:",
    card: {
      title: "The Horizon Penthouse — Victoria Island",
      subtitle: "2 Bed • 2.5 Bath • Ocean & Skyline View",
      price: "₦180,000 / night",
      image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80",
      specs: ["24/7 Power", "Private Infinity Pool", "Gym Access", "Smart Lock Check-in"],
      actionText: "Book Inspection / Stay"
    }
  },
  {
    id: 'healthcare',
    name: 'Clinics & Healthcare',
    industry: 'Medical',
    icon: Stethoscope,
    prompt: 'Consultation & Triage',
    visitorMessage: "Hello, I need to see a specialist for persistent back pain and review my lab scan. When is the earliest slot?",
    aiReply: "Hello there. We can arrange a consultation with Dr. Adeyemi, Senior Consultant Orthopedic Surgeon. He has morning clinic availability this Thursday:",
    card: {
      title: "Dr. K. Adeyemi — Orthopedic Clinic",
      subtitle: "Victoria Island Diagnostic Centre",
      price: "₦35,000 Consultation",
      image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=600&q=80",
      specs: ["MRI / X-Ray Review", "Thursday 10:30 AM", "30-Min In-Person", "Follow-up Included"],
      actionText: "Confirm Clinic Appointment"
    }
  },
  {
    id: 'faith',
    name: 'Churches & Non-Profits',
    industry: 'Community',
    icon: Church,
    prompt: 'First-Timer Discipleship',
    visitorMessage: "Good evening Pastor, I gave my life to Christ at yesterday's service and I want to join the discipleship track.",
    aiReply: "Glory to God! Welcome to the family of faith! We are overjoyed to walk with you. Here is your 30-day spiritual growth plan and first community fellowship group:",
    card: {
      title: "Foundation of Faith Track",
      subtitle: "New Believers Academy • Cohort 12",
      price: "Free Admission",
      image: "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&w=600&q=80",
      specs: ["Weekly Mentor Match", "Digital Study Guide", "Prayer Partner", "Certificate of Completion"],
      actionText: "Join Discipleship Group"
    }
  }
];

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth }) => {
  const [activeScenario, setActiveScenario] = useState<DemoScenario>(DEMO_SCENARIOS[0]);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [demoChatState, setDemoChatState] = useState<'ready' | 'booked'>('ready');

  const embedSnippet = `<!-- Shepherd AI Live Concierge Widget (Paste before </body>) -->
<script
  src="https://shepherd-ai.vercel.app/widget.js"
  data-org-id="YOUR_ORG_ID"
  data-color="#0d9488"
  defer>
</script>`;

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(embedSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2500);
  };

  const faqs = [
    {
      q: "Does Shepherd AI require Meta Cloud API verification or fees?",
      a: "No! Shepherd AI supports both a zero-Meta embeddable website widget (zero per-message fees) and an independent WhatsApp Web bridge that pairs via standard QR scanning without requiring Meta Cloud API business verification or template approval fees."
    },
    {
      q: "Can the AI automatically check live inventory (e.g., car rentals, rooms)?",
      a: "Yes. Shepherd AI features dual-mode catalog ingestion: you can either upload an Excel/CSV spreadsheet of your offerings or connect an external API webhook that queries your existing database or ERP in real-time."
    },
    {
      q: "Can human staff intervene if a customer needs personal attention?",
      a: "Absolutely. The unified Live Chats dashboard includes a real-time Human Co-Pilot Takeover switch. When enabled for a conversation, AI auto-replies pause instantly and your team can chat directly."
    },
    {
      q: "Can I customize the widget color and brand persona to match my website?",
      a: "Yes. The Widget Configurator allows you to set custom HEX colors (e.g., your exact brand color), customize welcome greetings, toggle audio notifications, and configure AI response tone."
    },
    {
      q: "Does it support Nigerian Pidgin, Yoruba, Hausa, and other languages?",
      a: "Yes. Shepherd AI's underlying neural reasoning models are trained to fluidly understand and respond in English, Nigerian Pidgin, Yoruba, Hausa, Igbo, and French, ensuring high engagement across diverse customer demographics."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-teal-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-emerald-600/15 rounded-full blur-[140px]" />
        <div className="absolute top-[35%] right-[-5%] w-[500px] h-[500px] bg-teal-600/15 rounded-full blur-[150px]" />
        <div className="absolute bottom-[10%] left-[-10%] w-[700px] h-[700px] bg-emerald-700/10 rounded-full blur-[160px]" />
      </div>

      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-emerald-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src={logoImage} alt="Shepherd AI" className="w-10 h-10 object-contain drop-shadow-md" />
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-teal-400 rounded-full border-2 border-slate-950" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-300 via-teal-200 to-teal-400 bg-clip-text text-transparent">
                Shepherd AI
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-emerald-900/60 border border-emerald-500/30 text-teal-300 rounded-full">
                Commerce & Concierge
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#simulator" className="hover:text-teal-300 transition-colors">Interactive Demo</a>
            <a href="#features" className="hover:text-teal-300 transition-colors">Capabilities</a>
            <a href="#solutions" className="hover:text-teal-300 transition-colors">Solutions</a>
            <a href="#embed" className="hover:text-teal-300 transition-colors">Widget Code</a>
            <a href="#faq" className="hover:text-teal-300 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onOpenAuth('login')}
              className="text-sm font-semibold text-slate-200 hover:text-white px-4 py-2 rounded-xl transition hover:bg-slate-900/80 border border-transparent hover:border-slate-800"
            >
              Sign In
            </button>
            <button
              onClick={() => onOpenAuth('register')}
              className="group relative inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/35 hover:from-emerald-400 hover:to-teal-400 transition-all transform active:scale-95"
            >
              <span>Get Started</span>
              <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-14 pb-20 sm:pt-20 sm:pb-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-medium mb-8 backdrop-blur-md shadow-inner">
            <Sparkles size={14} className="text-teal-400 animate-pulse" />
            <span>Autonomous Conversational Commerce & Live Concierge AI</span>
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
            <span className="text-slate-400">Zero Meta Cloud Fees</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-[1.12]">
            Turn Every Website Visitor & WhatsApp Chat into{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Confirmed Bookings & Revenue
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 sm:mt-8 text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
            Deploy autonomous AI concierges that recommend your live vehicle fleet, properties, or products, display rich visual cards with instant quotes, and collect deposits 24/7 across WhatsApp and your website.
          </p>

          {/* Action Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onOpenAuth('register')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-bold text-base shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:from-emerald-400 hover:to-cyan-400 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-3"
            >
              <span>Deploy Your AI Concierge</span>
              <ArrowRight size={18} />
            </button>
            <a
              href="#simulator"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold text-base border border-slate-700/80 transition-all flex items-center justify-center gap-2.5 backdrop-blur-md"
            >
              <Bot size={18} className="text-teal-400" />
              <span>Try Live Simulator</span>
            </a>
          </div>

          {/* Social Proof & Metrics */}
          <div className="mt-16 pt-10 border-t border-slate-800/80 max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-sm">
              <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">
                99.4%
              </div>
              <div className="text-xs sm:text-sm text-slate-400 mt-1">Autonomous Resolution</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-sm">
              <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-teal-300 to-cyan-300 bg-clip-text text-transparent">
                &lt; 1.2s
              </div>
              <div className="text-xs sm:text-sm text-slate-400 mt-1">Response Latency</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-sm">
              <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                3.8x
              </div>
              <div className="text-xs sm:text-sm text-slate-400 mt-1">Booking Conversion Lift</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-sm">
              <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
                0 ₦
              </div>
              <div className="text-xs sm:text-sm text-slate-400 mt-1">Meta Cloud Fee Required</div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Concierge Simulator Section */}
      <section id="simulator" className="relative z-10 py-16 sm:py-24 bg-slate-900/50 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-teal-400 text-xs sm:text-sm font-bold tracking-wider uppercase">
              Live Interactive Simulator
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
              Experience the Autonomous Concierge in Action
            </h2>
            <p className="text-slate-300 text-sm sm:text-base mt-3">
              Switch between industries below to see how Shepherd AI queries live inventory and formats rich visual cards for instant booking.
            </p>

            {/* Scenario Switcher Tabs */}
            <div className="mt-8 flex flex-wrap justify-center gap-2 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800 max-w-2xl mx-auto">
              {DEMO_SCENARIOS.map(scenario => {
                const IconComponent = scenario.icon;
                const isActive = activeScenario.id === scenario.id;
                return (
                  <button
                    key={scenario.id}
                    onClick={() => {
                      setActiveScenario(scenario);
                      setDemoChatState('ready');
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <IconComponent size={16} />
                    <span>{scenario.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Simulator Box */}
          <div className="max-w-4xl mx-auto bg-slate-950 border border-emerald-900/40 rounded-3xl shadow-2xl overflow-hidden">
            {/* Header bar */}
            <div className="px-6 py-4 bg-emerald-950/70 border-b border-emerald-900/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-teal-400 flex items-center justify-center text-teal-300">
                    <Bot size={20} />
                  </div>
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-950" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Shepherd AI Concierge</span>
                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-teal-500/20 text-teal-300 rounded border border-teal-500/30">
                      ONLINE
                    </span>
                  </div>
                  <div className="text-xs text-emerald-300/80">{activeScenario.industry} Assistant • Live Catalog Connected</div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="hidden sm:inline">Active Scenario:</span>
                <span className="text-teal-300 font-medium">{activeScenario.name}</span>
              </div>
            </div>

            {/* Conversation Flow */}
            <div className="p-6 sm:p-8 space-y-6 bg-gradient-to-b from-slate-950 via-slate-950 to-emerald-950/20">
              {/* User message */}
              <div className="flex justify-end">
                <div className="max-w-lg bg-teal-600/90 text-white rounded-2xl rounded-tr-xs px-5 py-3.5 text-sm shadow-md leading-relaxed">
                  <div className="text-[10px] text-teal-200 font-bold mb-1">Customer / Website Visitor</div>
                  {activeScenario.visitorMessage}
                </div>
              </div>

              {/* AI message */}
              <div className="flex justify-start items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 mt-1 shadow-sm">
                  <Bot size={18} />
                </div>
                <div className="max-w-xl space-y-4">
                  <div className="bg-slate-900 border border-slate-800 text-slate-200 rounded-2xl rounded-tl-xs px-5 py-3.5 text-sm shadow-md leading-relaxed">
                    <div className="text-[10px] text-emerald-400 font-bold mb-1">Shepherd AI Assistant</div>
                    {activeScenario.aiReply}
                  </div>

                  {/* Rich Offer Card */}
                  {activeScenario.card && (
                    <div className="bg-slate-900/90 border border-emerald-800/50 rounded-2xl overflow-hidden shadow-xl max-w-md">
                      <div className="relative h-44 overflow-hidden bg-slate-950">
                        <img
                          src={activeScenario.card.image}
                          alt={activeScenario.card.title}
                          className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-3 right-3 px-3 py-1 bg-emerald-900/90 border border-emerald-400/40 text-emerald-200 text-xs font-bold rounded-full backdrop-blur-md">
                          {activeScenario.card.price}
                        </div>
                      </div>
                      <div className="p-5">
                        <h4 className="font-bold text-white text-base sm:text-lg">
                          {activeScenario.card.title}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {activeScenario.card.subtitle}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {activeScenario.card.specs.map((spec, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-slate-800 border border-slate-700/60 rounded text-[11px] text-slate-300 font-medium"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle2 size={13} /> Immediate Reservation
                          </span>
                          <button
                            onClick={() => setDemoChatState('booked')}
                            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
                          >
                            {demoChatState === 'booked' ? '✓ Reservation Initiated' : activeScenario.card.actionText}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {demoChatState === 'booked' && (
                    <div className="p-4 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl text-xs text-emerald-200 flex items-center gap-3 animate-fadeIn">
                      <CheckCircle2 size={18} className="text-teal-400 shrink-0" />
                      <div>
                        <div className="font-bold text-white">Reservation Slot Locked!</div>
                        <div>Customer contact verified & payment checkout link generated automatically.</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Simulated Input Bar */}
            <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex items-center gap-3">
              <input
                type="text"
                readOnly
                value={demoChatState === 'booked' ? "Reservation confirmed! Anything else I can assist with?" : "Type a query or prompt to test..."}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-400 focus:outline-none cursor-default"
              />
              <button
                onClick={() => setDemoChatState('booked')}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
              >
                <Send size={13} /> Send
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Core Enterprise Capabilities Grid */}
      <section id="features" className="relative z-10 py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-teal-400 text-xs sm:text-sm font-bold tracking-wider uppercase">
              Engineered for Revenue
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white mt-2">
              Everything Needed to Run Autonomous Digital Commerce
            </h2>
            <p className="text-slate-400 text-base mt-4">
              From live car fleet availability to hospital appointments, Shepherd AI coordinates the entire discovery-to-booking pipeline.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/40 transition-all group backdrop-blur-sm">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-teal-300 group-hover:scale-110 transition-transform">
                <Database size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mt-6">Live Catalog & Webhook Sync</h3>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                Connect your live PostgreSQL or REST API endpoint to serve real-time vehicle availability, room rates, or product stocks, or upload Excel/CSV catalogs with one click.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/40 transition-all group backdrop-blur-sm">
              <div className="w-12 h-12 rounded-2xl bg-teal-950/80 border border-teal-500/30 flex items-center justify-center text-teal-300 group-hover:scale-110 transition-transform">
                <Smartphone size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mt-6">Zero-Meta WhatsApp & Web</h3>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                Operate across both standard websites with a 1-line script and WhatsApp using independent QR pairing. Avoid Meta’s restrictive approvals and message fees.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/40 transition-all group backdrop-blur-sm">
              <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-300 group-hover:scale-110 transition-transform">
                <Layers size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mt-6">Rich Visual Product Cards</h3>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                Don’t just send walls of text. Shepherd AI automatically renders high-resolution photos, specification badges, pricing tags, and direct booking trigger buttons.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/40 transition-all group backdrop-blur-sm">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-300 group-hover:scale-110 transition-transform">
                <Users size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mt-6">Human Co-Pilot Takeover</h3>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                Staff can monitor live conversations and jump in with a single switch. AI instantly yields control, allowing human agents to finalize high-value enterprise deals.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/40 transition-all group backdrop-blur-sm">
              <div className="w-12 h-12 rounded-2xl bg-teal-950/80 border border-teal-500/30 flex items-center justify-center text-teal-300 group-hover:scale-110 transition-transform">
                <CalendarCheck size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mt-6">Automated Booking & Deposit</h3>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                Collect booking dates, rental durations, inspection times, and dispatch Paystack or Flutterwave payment links directly inside the chat flow.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/40 transition-all group backdrop-blur-sm">
              <div className="w-12 h-12 rounded-2xl bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-300 group-hover:scale-110 transition-transform">
                <Zap size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mt-6">Multilingual & Pidgin AI</h3>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                Trained to handle nuance in Nigerian Pidgin, Yoruba, Hausa, Igbo, French, and Queen's English, providing a welcoming and culturally authentic brand tone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Embeddable Code Section */}
      <section id="embed" className="relative z-10 py-16 sm:py-24 bg-slate-900/40 border-y border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5 space-y-4">
              <span className="text-teal-400 text-xs sm:text-sm font-bold tracking-wider uppercase">
                60-Second Integration
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                Works on Any Website or Landing Page
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Just paste a single script tag before your closing <code className="text-teal-300 font-mono text-xs bg-slate-950 px-2 py-0.5 rounded border border-slate-800">&lt;/body&gt;</code> tag. The widget is ultra-lightweight (&lt; 25KB), mobile-responsive, and loads asynchronously.
              </p>

              <div className="pt-2 space-y-2.5 text-xs sm:text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-teal-400 shrink-0" />
                  <span>Compatible with WordPress, Shopify, Webflow, React, HTML</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-teal-400 shrink-0" />
                  <span>Fully custom brand colors via <code className="text-teal-300">data-color</code></span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-teal-400 shrink-0" />
                  <span>Zero iframe bloat • Fast native DOM rendering</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    <span className="ml-2 text-xs font-mono text-slate-400">embed-widget.html</span>
                  </div>
                  <button
                    onClick={handleCopySnippet}
                    className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition"
                  >
                    {copiedSnippet ? (
                      <>
                        <Check size={13} className="text-emerald-400" />
                        <span className="text-emerald-400">Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-5 font-mono text-xs sm:text-sm text-slate-300 overflow-x-auto leading-relaxed">
                  <pre className="text-emerald-300">
{`<!-- Shepherd AI Live Concierge Widget (Paste before </body>) -->
<script
  src="https://shepherd-ai.vercel.app/widget.js"
  data-org-id="your-business-id"
  data-color="#0d9488"
  defer>
</script>`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Industry Solutions */}
      <section id="solutions" className="relative z-10 py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-teal-400 text-xs sm:text-sm font-bold tracking-wider uppercase">
              Versatile Architecture
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white mt-2">
              Purpose-Built for High-Growth Industries
            </h2>
            <p className="text-slate-400 text-base mt-4">
              Whether you are renting luxury Mercedes SUVs, booking hotel penthouses, or registering clinic patients, Shepherd AI adapts to your business model.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Automotive / Rentals */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-900/40">
              <div className="p-3 w-fit rounded-xl bg-emerald-950 border border-emerald-500/30 text-teal-300 mb-4">
                <Car size={22} />
              </div>
              <h4 className="text-lg font-bold text-white">Car Rentals & Fleet Operators</h4>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                Rentigram and fleet operators can automate daily rates, chauffeur add-ons, security deposit instructions, and pickup logistics with visual vehicle galleries.
              </p>
            </div>

            {/* Real Estate / Shortlets */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-teal-900/40">
              <div className="p-3 w-fit rounded-xl bg-teal-950 border border-teal-500/30 text-teal-300 mb-4">
                <Building2 size={22} />
              </div>
              <h4 className="text-lg font-bold text-white">Real Estate & Shortlets</h4>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                Filter apartments by power redundancy, pool amenities, or location (Lekki, Ikeja, VI, Abuja), and let clients book property inspections instantly.
              </p>
            </div>

            {/* Healthcare & Clinics */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-cyan-900/40">
              <div className="p-3 w-fit rounded-xl bg-cyan-950 border border-cyan-500/30 text-cyan-300 mb-4">
                <Stethoscope size={22} />
              </div>
              <h4 className="text-lg font-bold text-white">Clinics & Diagnostic Centres</h4>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                Provide preliminary triage, specialist clinic schedule information, appointment slots, and automated reminder alerts to reduce patient no-shows.
              </p>
            </div>

            {/* Retail & E-Commerce */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800">
              <div className="p-3 w-fit rounded-xl bg-slate-900 border border-slate-700 text-slate-300 mb-4">
                <ShoppingBag size={22} />
              </div>
              <h4 className="text-lg font-bold text-white">Retail & E-Commerce</h4>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                Recommend items based on buyer preferences, answer questions on sizes and warranties, and convert abandoned browsing sessions into closed checkouts.
              </p>
            </div>

            {/* Faith-Based */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800">
              <div className="p-3 w-fit rounded-xl bg-slate-900 border border-slate-700 text-slate-300 mb-4">
                <Church size={22} />
              </div>
              <h4 className="text-lg font-bold text-white">Faith Communities & NGOs</h4>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                Automate first-timer follow-ups, devotional distribution, volunteer onboarding, and prayer request routing with personalized pastoral touch.
              </p>
            </div>

            {/* Enterprise Custom */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-800/60">
              <div className="p-3 w-fit rounded-xl bg-emerald-900/50 border border-emerald-500/40 text-emerald-300 mb-4">
                <Zap size={22} />
              </div>
              <h4 className="text-lg font-bold text-white">Custom API & ERP Integrations</h4>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                Connect directly into SAP, Oracle, Zoho, custom Node.js/Python backends, or legacy accounting software for bespoke enterprise operations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section id="faq" className="relative z-10 py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-teal-400 text-xs sm:text-sm font-bold tracking-wider uppercase">
              Clarity & Transparency
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between text-sm sm:text-base font-bold text-white hover:text-teal-300 transition"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp size={18} className="text-teal-400 shrink-0 ml-4" />
                    ) : (
                      <ChevronDown size={18} className="text-slate-400 shrink-0 ml-4" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/60 pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Bottom Banner */}
      <section className="relative z-10 py-16 sm:py-20 bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 border-t border-emerald-800/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white">
            Ready to Automate Inquiries and Boost Bookings?
          </h2>
          <p className="text-slate-300 text-sm sm:text-base mt-4 max-w-2xl mx-auto">
            Get your live concierge running on your website in under 5 minutes. No credit card required to explore.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
            <button
              onClick={() => onOpenAuth('register')}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-base shadow-xl transition transform hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <span>Launch Your Free Trial</span>
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => onOpenAuth('login')}
              className="px-8 py-4 rounded-2xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-white font-semibold text-base transition"
            >
              Access Existing Account
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 bg-slate-950 border-t border-slate-900 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={logoImage} alt="Shepherd AI" className="w-7 h-7 object-contain" />
            <span className="font-bold text-slate-200">Shepherd AI Technologies</span>
            <span>•</span>
            <span>Autonomous Commerce Engine</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>All Systems Operational (99.98% Uptime)</span>
            </div>
          </div>

          <div className="text-slate-500">
            © 2025 Shepherd AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
