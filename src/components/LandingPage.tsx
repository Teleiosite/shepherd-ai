import React, { useState, useEffect, useRef } from 'react';
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
  Clock,
  Bike,
  Utensils,
  Play,
  Pause,
  RotateCcw,
  X,
  MessageCircle,
  CheckCircle
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
  visitorMessage: string;
  aiReply: string;
  card: {
    title: string;
    subtitle: string;
    price: string;
    image: string;
    specs: string[];
    actionText: string;
    successMessage: string;
  };
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'powerbike',
    name: 'Power Bike (Abuja)',
    industry: 'Powersports & Logistics',
    icon: Bike,
    visitorMessage: "Hi, I need a Power Bike for a 3-day corporate trip in Abuja, starting tomorrow. Do you have anything available?",
    aiReply: "Hello! Absolutely. We have two premium touring adventure power bikes ready for dispatch in Abuja tomorrow morning. Both come with full protective riding gear and GPS tracking:",
    card: {
      title: "BMW R1250 GS Adventure (2024)",
      subtitle: "Flagship Adventure Power Bike • Maitama & Central Abuja Delivery",
      price: "₦85,000 / day",
      image: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=700&q=80",
      specs: ["1254cc Boxer Engine", "Full Riding Gear & Helmet Included", "Live GPS Tracking", "Same-Day Abuja Delivery"],
      actionText: "Reserve Power Bike",
      successMessage: "Power Bike slot locked! Check-in instructions & helmet size form dispatched."
    }
  },
  {
    id: 'amala',
    name: 'Amala & Ewedu (Food)',
    industry: 'Restaurant & Fast Dispatch',
    icon: Utensils,
    visitorMessage: "Hi, I need Amala and Ewedu with goat meat, do you have anything available?",
    aiReply: "Good day! Yes, our kitchen has fresh piping hot Amala, authentic Ewedu with rich spicy Gbegiri, and tender assorted goat meat ready for express dispatch right now:",
    card: {
      title: "Buka Supreme Amala & Ewedu Platter",
      subtitle: "Tender Goat Meat & Shaki • Authentic Gbegiri • Fresh Hot Ewedu",
      price: "₦4,500 / plate",
      image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=700&q=80",
      specs: ["Piping Hot Fresh", "Tender Goat Meat & Shaki", "Authentic Ewedu & Gbegiri", "Express Dispatch < 30 Mins"],
      actionText: "Order Amala Now",
      successMessage: "Order placed! Kitchen preparing your hot Amala. Dispatch rider assigned."
    }
  },
  {
    id: 'rentals',
    name: 'Luxury SUV (Lagos)',
    industry: 'Automotive & Fleet (Rentigram)',
    icon: Car,
    visitorMessage: "Hi, I need a luxury SUV for a 3-day corporate trip in Lekki, starting tomorrow. Do you have anything available?",
    aiReply: "Hello! Absolutely. We have two premium SUVs ready for delivery in Lekki tomorrow morning with full comprehensive insurance and optional chauffeur service:",
    card: {
      title: "Mercedes-Benz G63 AMG (2023)",
      subtitle: "Luxury SUV • Chauffeur or Self-Drive",
      price: "₦350,000 / day",
      image: "https://images.unsplash.com/photo-1520031441872-265e4ff70366?auto=format&fit=crop&w=700&q=80",
      specs: ["V8 Biturbo", "Security Escort Ready", "Full Air-Conditioning", "Lekki / VI Delivery"],
      actionText: "Reserve G-Wagon",
      successMessage: "Mercedes G-Wagon reservation initiated! Security deposit link sent."
    }
  },
  {
    id: 'shortlets',
    name: 'Penthouse (Victoria Island)',
    industry: 'Real Estate & Hospitality',
    icon: Building2,
    visitorMessage: "Good day! Looking for a 2-bedroom luxury penthouse in Victoria Island with 24/7 power for next weekend.",
    aiReply: "Welcome! We have the perfect serviced apartment available for next weekend. It comes with 24/7 uninterrupted power, high-speed fiber internet, and a private ocean view:",
    card: {
      title: "The Horizon Penthouse — Victoria Island",
      subtitle: "2 Bed • 2.5 Bath • Ocean & Skyline View",
      price: "₦180,000 / night",
      image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=700&q=80",
      specs: ["24/7 Power", "Private Infinity Pool", "Gym Access", "Smart Lock Check-in"],
      actionText: "Book Inspection / Stay",
      successMessage: "Dates confirmed! Smart lock check-in pin and access guide dispatched."
    }
  }
];

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth }) => {
  // Motion Graphic & Simulator State
  const [activeScenarioIndex, setActiveScenarioIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [animPhase, setAnimPhase] = useState<
    'typing_input' | 'sending' | 'visitor_bubble' | 'ai_thinking' | 'ai_reply' | 'card_reveal' | 'hold'
  >('typing_input');
  const [inputTypedText, setInputTypedText] = useState('');
  const [isBooked, setIsBooked] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);

  // Deployment Request Modal State
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [deploySubmitted, setDeploySubmitted] = useState(false);
  const [deployFormData, setDeployFormData] = useState({
    fullName: '',
    companyName: '',
    email: '',
    phone: '',
    industry: 'Car Rental & Fleet Logistics',
    volume: '500 – 2,500 inquiries/month',
    notes: ''
  });

  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const activeScenario = DEMO_SCENARIOS[activeScenarioIndex];
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Motion Graphic Engine
  useEffect(() => {
    if (!isPlaying) return;

    let charIndex = 0;
    const fullText = activeScenario.visitorMessage;

    // Phase 1: Typing input
    setAnimPhase('typing_input');
    setInputTypedText('');
    setIsBooked(false);

    const typeInterval = setInterval(() => {
      if (charIndex < fullText.length) {
        charIndex++;
        setInputTypedText(fullText.slice(0, charIndex));
        setProgressPercent(Math.round((charIndex / fullText.length) * 30));
      } else {
        clearInterval(typeInterval);

        // Phase 2: Send flash
        setAnimPhase('sending');
        setProgressPercent(35);

        timerRef.current = setTimeout(() => {
          // Phase 3: Visitor bubble appears
          setAnimPhase('visitor_bubble');
          setInputTypedText('');
          setProgressPercent(45);

          // Phase 4: AI Thinking
          timerRef.current = setTimeout(() => {
            setAnimPhase('ai_thinking');
            setProgressPercent(55);

            // Phase 5: AI Reply
            timerRef.current = setTimeout(() => {
              setAnimPhase('ai_reply');
              setProgressPercent(75);

              // Phase 6: Card Reveal
              timerRef.current = setTimeout(() => {
                setAnimPhase('card_reveal');
                setProgressPercent(90);

                // Phase 7: Hold & view
                timerRef.current = setTimeout(() => {
                  setAnimPhase('hold');
                  setProgressPercent(100);

                  // Next scenario auto-transition
                  timerRef.current = setTimeout(() => {
                    setActiveScenarioIndex((prev) => (prev + 1) % DEMO_SCENARIOS.length);
                  }, 4500);
                }, 1000);
              }, 800);
            }, 1200);
          }, 900);
        }, 350);
      }
    }, 28);

    return () => {
      clearInterval(typeInterval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeScenarioIndex, isPlaying]);

  const handleSelectScenario = (index: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setActiveScenarioIndex(index);
    setInputTypedText('');
    setAnimPhase('typing_input');
    setIsBooked(false);
  };

  const handleReplay = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setInputTypedText('');
    setAnimPhase('typing_input');
    setIsBooked(false);
    setIsPlaying(true);
  };

  const handleDeploySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const existing = JSON.parse(localStorage.getItem('shepherd_deployment_leads') || '[]');
      existing.push({
        ...deployFormData,
        submittedAt: new Date().toISOString()
      });
      localStorage.setItem('shepherd_deployment_leads', JSON.stringify(existing));
    } catch (err) {
      console.error(err);
    }
    setDeploySubmitted(true);
  };

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
      q: "Can the AI automatically check live inventory (e.g., car rentals, food menus, rooms)?",
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-teal-500 selection:text-white relative">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-emerald-600/15 rounded-full blur-[140px]" />
        <div className="absolute top-[35%] right-[-5%] w-[500px] h-[500px] bg-teal-600/15 rounded-full blur-[150px]" />
        <div className="absolute bottom-[10%] left-[-10%] w-[700px] h-[700px] bg-emerald-700/10 rounded-full blur-[160px]" />
      </div>

      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/85 border-b border-emerald-900/30">
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
            <a href="#simulator" className="hover:text-teal-300 transition-colors">Live Simulation</a>
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
              onClick={() => {
                setDeploySubmitted(false);
                setIsDeployModalOpen(true);
              }}
              className="group relative inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/35 hover:from-emerald-400 hover:to-teal-400 transition-all transform active:scale-95"
            >
              <span>Request Custom Deployment</span>
              <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-14 pb-16 sm:pt-20 sm:pb-24 overflow-hidden">
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
            Deploy autonomous AI concierges that recommend your live vehicle fleet, food menus, or properties, display rich visual cards with instant quotes, and collect deposits 24/7 across WhatsApp and your website.
          </p>

          {/* Action Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => {
                setDeploySubmitted(false);
                setIsDeployModalOpen(true);
              }}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-bold text-base shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:from-emerald-400 hover:to-cyan-400 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-3"
            >
              <span>Request Custom Deployment</span>
              <ArrowRight size={18} />
            </button>
            <a
              href="#simulator"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold text-base border border-slate-700/80 transition-all flex items-center justify-center gap-2.5 backdrop-blur-md"
            >
              <Bot size={18} className="text-teal-400" />
              <span>Watch Live Motion Demo</span>
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

      {/* MOTION GRAPHIC & LIVE SIMULATOR SECTION */}
      <section id="simulator" className="relative z-10 py-16 sm:py-24 bg-slate-900/50 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/70 border border-red-500/30 text-red-300 text-xs font-bold tracking-wider uppercase mb-3">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
              <span>Live Motion Graphic Simulation</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Watch Shepherd AI Respond to Inquiries in Real Time
            </h2>
            <p className="text-slate-300 text-sm sm:text-base mt-2">
              From power bikes in Abuja to hot Amala orders and luxury car fleets, watch how the neural concierge queries live inventory and formats rich action cards on the fly.
            </p>

            {/* Scenario Selection Chips */}
            <div className="mt-6 flex flex-wrap justify-center gap-2 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800 max-w-3xl mx-auto">
              {DEMO_SCENARIOS.map((scenario, index) => {
                const IconComponent = scenario.icon;
                const isActive = activeScenarioIndex === index;
                return (
                  <button
                    key={scenario.id}
                    onClick={() => handleSelectScenario(index)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <IconComponent size={15} />
                    <span>{scenario.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Simulated Video-Like Chrome Frame */}
          <div className="max-w-4xl mx-auto bg-slate-950 border border-emerald-900/50 rounded-3xl shadow-2xl overflow-hidden relative">
            {/* Timeline Progress Bar */}
            <div className="h-1 bg-slate-900 w-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Video Player Header Bar */}
            <div className="px-5 py-3.5 bg-emerald-950/80 border-b border-emerald-900/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="h-4 w-px bg-slate-800 ml-1" />
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white tracking-wide">
                    Shepherd AI Motion Simulator
                  </span>
                  <span className="hidden sm:inline-block text-[10px] text-teal-300 bg-teal-950 px-2 py-0.5 rounded border border-teal-500/30">
                    {activeScenario.industry}
                  </span>
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs flex items-center gap-1 transition"
                  title={isPlaying ? 'Pause Motion' : 'Play Motion'}
                >
                  {isPlaying ? <Pause size={14} className="text-teal-400" /> : <Play size={14} className="text-emerald-400" />}
                  <span className="hidden sm:inline text-[11px] font-medium">{isPlaying ? 'Pause' : 'Play'}</span>
                </button>
                <button
                  onClick={handleReplay}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs flex items-center gap-1 transition"
                  title="Replay Current Scenario"
                >
                  <RotateCcw size={14} />
                  <span className="hidden sm:inline text-[11px] font-medium">Replay</span>
                </button>
              </div>
            </div>

            {/* Live Chat Canvas */}
            <div className="p-6 sm:p-8 min-h-[440px] flex flex-col justify-between bg-gradient-to-b from-slate-950 via-slate-950 to-emerald-950/20">
              <div className="space-y-6">
                {/* 1. Visitor Chat Bubble (Reveals after typing) */}
                {(animPhase !== 'typing_input') && (
                  <div className="flex justify-end animate-fadeIn">
                    <div className="max-w-lg bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-2xl rounded-tr-xs px-5 py-3.5 text-sm shadow-xl leading-relaxed">
                      <div className="text-[10px] text-teal-200 font-bold mb-1 flex items-center justify-between gap-4">
                        <span>Customer Inquiry</span>
                        <span className="text-[9px] opacity-75">Just now</span>
                      </div>
                      {activeScenario.visitorMessage}
                    </div>
                  </div>
                )}

                {/* 2. AI Thinking Indicator */}
                {animPhase === 'ai_thinking' && (
                  <div className="flex items-center gap-3 animate-fadeIn">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-md animate-pulse">
                      <Bot size={18} />
                    </div>
                    <div className="px-4 py-2.5 bg-slate-900 border border-emerald-900/60 rounded-2xl rounded-tl-xs flex items-center gap-2.5 text-xs text-emerald-300">
                      <span className="font-semibold">Querying live inventory & pricing</span>
                      <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    </div>
                  </div>
                )}

                {/* 3. AI Reply & Rich Card Reveal */}
                {(animPhase === 'ai_reply' || animPhase === 'card_reveal' || animPhase === 'hold') && (
                  <div className="flex justify-start items-start gap-3 animate-fadeIn">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 mt-1 shadow-md">
                      <Bot size={18} />
                    </div>
                    <div className="max-w-xl space-y-4">
                      {/* Message Bubble */}
                      <div className="bg-slate-900 border border-slate-800 text-slate-200 rounded-2xl rounded-tl-xs px-5 py-3.5 text-sm shadow-md leading-relaxed">
                        <div className="text-[10px] text-emerald-400 font-bold mb-1 flex items-center gap-1.5">
                          <Sparkles size={11} /> Shepherd AI Concierge
                        </div>
                        {activeScenario.aiReply}
                      </div>

                      {/* Motion Visual Card */}
                      {(animPhase === 'card_reveal' || animPhase === 'hold') && (
                        <div className="bg-slate-900 border border-emerald-800/60 rounded-2xl overflow-hidden shadow-2xl max-w-md transform transition-all duration-500 animate-slideUp">
                          <div className="relative h-48 overflow-hidden bg-slate-950 group">
                            <img
                              src={activeScenario.card.image}
                              alt={activeScenario.card.title}
                              className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
                            />
                            <div className="absolute top-3 right-3 px-3 py-1 bg-emerald-950/90 border border-emerald-400/50 text-emerald-200 text-xs font-bold rounded-full backdrop-blur-md shadow-lg">
                              {activeScenario.card.price}
                            </div>
                            <div className="absolute bottom-2 left-3 px-2 py-0.5 bg-black/60 backdrop-blur-xs text-[10px] text-slate-300 rounded font-medium">
                              Live Availability: Confirmed
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
                                  className="px-2.5 py-1 bg-slate-800/90 border border-slate-700/60 rounded-lg text-[11px] text-slate-300 font-medium"
                                >
                                  {spec}
                                </span>
                              ))}
                            </div>

                            <div className="mt-5 pt-3.5 border-t border-slate-800 flex items-center justify-between">
                              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                                <CheckCircle2 size={13} /> Instant Dispatch Ready
                              </span>
                              <button
                                onClick={() => setIsBooked(true)}
                                className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition transform active:scale-95 flex items-center gap-1.5"
                              >
                                <span>{isBooked ? '✓ Reserved' : activeScenario.card.actionText}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Confirmation Toast */}
                      {isBooked && (
                        <div className="p-4 bg-emerald-950/90 border border-emerald-400/50 rounded-2xl text-xs text-emerald-200 flex items-center gap-3 animate-fadeIn shadow-xl">
                          <CheckCircle2 size={20} className="text-teal-400 shrink-0" />
                          <div>
                            <div className="font-bold text-white text-sm">Action Confirmed!</div>
                            <div>{activeScenario.card.successMessage}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Motion Graphic Typewriter Input Bar */}
              <div className="mt-6 pt-4 border-t border-slate-800/80">
                <div className="text-[11px] text-slate-400 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-teal-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
                    {animPhase === 'typing_input' ? 'Simulating Visitor Typing in Real Time...' : 'Visitor Message Dispatched'}
                  </span>
                  <span className="text-slate-500">Autonomous Neural Engine</span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-inner">
                  <div className="flex-1 text-xs sm:text-sm text-slate-200 min-h-[22px] flex items-center font-mono">
                    {animPhase === 'typing_input' ? (
                      <>
                        <span>{inputTypedText}</span>
                        <span className="w-2 h-4 bg-teal-400 ml-0.5 animate-pulse inline-block" />
                      </>
                    ) : (
                      <span className="text-slate-500 italic">Listening for next query...</span>
                    )}
                  </div>
                  <div
                    className={`p-2 rounded-xl transition-all ${
                      animPhase === 'sending'
                        ? 'bg-teal-400 text-slate-950 scale-110 shadow-lg shadow-teal-400/50'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Send size={15} />
                  </div>
                </div>
              </div>
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
              From live car fleet availability to hospital appointments and restaurant orders, Shepherd AI coordinates the entire discovery-to-booking pipeline.
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
              Whether you are renting luxury Mercedes SUVs, booking hotel penthouses, or dispatching delicious restaurant orders, Shepherd AI adapts to your business model.
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

            {/* Food & Restaurant */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-900/40">
              <div className="p-3 w-fit rounded-xl bg-emerald-950 border border-emerald-500/30 text-teal-300 mb-4">
                <Utensils size={22} />
              </div>
              <h4 className="text-lg font-bold text-white">Restaurants & Cloud Kitchens</h4>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                Automate inquiries for local dishes like Amala, Ewedu, Jollof Rice, take table reservations, and dispatch payment checkout links directly on WhatsApp.
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
            Tailored AI concierge deployment, custom inventory integration, and dedicated technical support for your enterprise.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
            <button
              onClick={() => {
                setDeploySubmitted(false);
                setIsDeployModalOpen(true);
              }}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-base shadow-xl transition transform hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <span>Request Custom Deployment</span>
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

      {/* DEDICATED CUSTOM DEPLOYMENT REQUEST MODAL */}
      {isDeployModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-lg bg-slate-900 border border-emerald-500/40 rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden my-8">
            {/* Close Button */}
            <button
              onClick={() => setIsDeployModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition"
            >
              <X size={18} />
            </button>

            {!deploySubmitted ? (
              <div>
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <Sparkles size={14} />
                  <span>Enterprise Deployment</span>
                </div>
                <h3 className="text-2xl font-black text-white">
                  Request Custom AI Deployment
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 mb-6">
                  Provide your business details and our senior technical architect will review your inventory specifications and connect within 2 hours.
                </p>

                <form onSubmit={handleDeploySubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Fortunate Ogamba"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-teal-400 rounded-xl text-sm text-white focus:outline-none"
                      value={deployFormData.fullName}
                      onChange={(e) => setDeployFormData({ ...deployFormData, fullName: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Company / Fleet / Brand Name *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Rentigram Car Rentals"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-teal-400 rounded-xl text-sm text-white focus:outline-none"
                      value={deployFormData.companyName}
                      onChange={(e) => setDeployFormData({ ...deployFormData, companyName: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Work Email *
                      </label>
                      <input
                        required
                        type="email"
                        placeholder="you@company.com"
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-teal-400 rounded-xl text-sm text-white focus:outline-none"
                        value={deployFormData.email}
                        onChange={(e) => setDeployFormData({ ...deployFormData, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        WhatsApp Number *
                      </label>
                      <input
                        required
                        type="tel"
                        placeholder="+234 801 234 5678"
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-teal-400 rounded-xl text-sm text-white focus:outline-none"
                        value={deployFormData.phone}
                        onChange={(e) => setDeployFormData({ ...deployFormData, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Primary Industry / Use Case
                    </label>
                    <select
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-teal-400 rounded-xl text-sm text-white focus:outline-none"
                      value={deployFormData.industry}
                      onChange={(e) => setDeployFormData({ ...deployFormData, industry: e.target.value })}
                    >
                      <option value="Car Rental & Fleet Logistics">Car Rental & Fleet Logistics (e.g. Rentigram)</option>
                      <option value="Powersports & Logistics">Power Bikes & Dispatch Fleet</option>
                      <option value="Restaurant & Food Delivery">Restaurants & Food Delivery (Amala, Ewedu, Jollof)</option>
                      <option value="Real Estate & Shortlets">Real Estate & Serviced Apartments</option>
                      <option value="Healthcare & Clinics">Healthcare & Doctor Bookings</option>
                      <option value="E-Commerce & Retail">E-Commerce & Retail Catalogs</option>
                      <option value="Other Custom Workflow">Other Custom Enterprise Workflow</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Specific Requirements / Catalog Details (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Need WhatsApp AI hooked into our vehicle inventory database with Paystack deposit links..."
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-teal-400 rounded-xl text-sm text-white focus:outline-none"
                      value={deployFormData.notes}
                      onChange={(e) => setDeployFormData({ ...deployFormData, notes: e.target.value })}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-bold text-sm shadow-xl shadow-emerald-500/25 transition transform active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span>Submit Deployment Request</span>
                    <ArrowRight size={16} />
                  </button>

                  <div className="pt-2 text-center text-xs text-slate-400">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsDeployModalOpen(false);
                        onOpenAuth('login');
                      }}
                      className="text-teal-400 hover:underline font-semibold"
                    >
                      Sign in here
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="text-center py-6 animate-fadeIn">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 mx-auto mb-4">
                  <CheckCircle size={36} />
                </div>
                <h3 className="text-2xl font-black text-white">
                  Deployment Request Received!
                </h3>
                <p className="text-sm text-slate-300 mt-2 max-w-sm mx-auto">
                  Thank you, <span className="font-semibold text-teal-300">{deployFormData.fullName}</span>! Your request for <span className="font-semibold text-white">{deployFormData.companyName}</span> has been logged.
                </p>
                <p className="text-xs text-slate-400 mt-2 mb-6">
                  Our Lead Solutions Architect has been alerted and will reach out to review your catalog integration within 2 hours.
                </p>

                <div className="p-4 bg-emerald-950/80 border border-emerald-500/30 rounded-2xl mb-6 text-left text-xs text-slate-300 space-y-1">
                  <div className="font-bold text-white mb-1 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-teal-400" /> What happens next?
                  </div>
                  <div>1. We configure your dedicated tenant & isolated WhatsApp bridge.</div>
                  <div>2. We hook up your fleet or product catalog (API or CSV).</div>
                  <div>3. We conduct a live end-to-end booking test before launch.</div>
                </div>

                <div className="flex flex-col gap-3">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Hello Shepherd AI, I just submitted an Enterprise Deployment request for ${deployFormData.companyName} (${deployFormData.fullName}, ${deployFormData.phone}). I would like to expedite our deployment setup.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition"
                  >
                    <MessageCircle size={16} />
                    <span>Chat with Technical Lead on WhatsApp for Expedited Setup</span>
                  </a>

                  <button
                    onClick={() => setIsDeployModalOpen(false)}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                  >
                    Back to Website
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
