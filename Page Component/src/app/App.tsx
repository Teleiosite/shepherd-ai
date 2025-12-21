import { useState } from "react";
import { Eye, EyeOff, Apple, Chrome, Check, X, Info, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Checkbox } from "./components/ui/checkbox";

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'colors' | 'typography' | 'components' | 'spacing'>('overview');
  const [showPassword, setShowPassword] = useState(false);
  const [checked, setChecked] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold">S</span>
              </div>
              <div>
                <h1 className="font-bold text-gray-900">Shepherd AI Design System</h1>
                <p className="text-sm text-gray-500">v1.0.0</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {(['overview', 'colors', 'typography', 'spacing', 'components'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-medium text-sm capitalize transition-colors border-b-2 ${
                  activeTab === tab
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-12">
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Design Principles</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-200">
                  <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
                    <CheckCircle2 className="size-6 text-teal-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Organic & Flowing</h3>
                  <p className="text-gray-600 text-sm">Curved shapes, S-waves, and rounded corners create a welcoming, modern aesthetic that feels approachable yet professional.</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-200">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                    <Eye className="size-6 text-emerald-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">High Contrast</h3>
                  <p className="text-gray-600 text-sm">Accessibility-first design with clear visual hierarchy. White text on dark backgrounds, dark text on light surfaces.</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-200">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                    <Info className="size-6 text-green-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Monochromatic Green</h3>
                  <p className="text-gray-600 text-sm">Deep forest greens with teal accents create a trustworthy, nature-inspired palette that conveys growth and stability.</p>
                </div>
              </div>
            </section>

            <section className="bg-white p-8 rounded-2xl border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Key Characteristics</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Visual Style</h4>
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-start gap-2">
                      <Check className="size-5 text-teal-500 mt-0.5 shrink-0" />
                      <span>Pill-shaped buttons and inputs (fully rounded)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="size-5 text-teal-500 mt-0.5 shrink-0" />
                      <span>Large border radius on cards (24-32px)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="size-5 text-teal-500 mt-0.5 shrink-0" />
                      <span>Subtle shadows and depth</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="size-5 text-teal-500 mt-0.5 shrink-0" />
                      <span>Organic background elements (blurred circles)</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Interaction Design</h4>
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-start gap-2">
                      <Check className="size-5 text-teal-500 mt-0.5 shrink-0" />
                      <span>Smooth transitions (200-300ms)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="size-5 text-teal-500 mt-0.5 shrink-0" />
                      <span>Hover states with opacity or color shifts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="size-5 text-teal-500 mt-0.5 shrink-0" />
                      <span>Clear focus states with rings</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="size-5 text-teal-500 mt-0.5 shrink-0" />
                      <span>Generous touch targets (44px minimum)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Colors Tab */}
        {activeTab === 'colors' && (
          <div className="space-y-8">
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Color Palette</h2>
              <p className="text-gray-600 mb-8">Forest green and teal-based monochromatic system with high-contrast pairings.</p>
              
              {/* Primary Colors */}
              <div className="mb-8">
                <h3 className="font-bold text-gray-900 mb-4">Primary - Forest Green</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {[
                    { name: 'Forest 50', value: '#f0f9f6', hex: '#f0f9f6' },
                    { name: 'Forest 100', value: '#d1ede4', hex: '#d1ede4' },
                    { name: 'Forest 200', value: '#a3dbc9', hex: '#a3dbc9' },
                    { name: 'Forest 300', value: '#5a9a8a', hex: '#5a9a8a' },
                    { name: 'Forest 400', value: '#2d5a4a', hex: '#2d5a4a' },
                    { name: 'Forest 500', value: '#1e4d3c', hex: '#1e4d3c' },
                    { name: 'Forest 600', value: '#1a3a2e', hex: '#1a3a2e' },
                    { name: 'Forest 700', value: '#152d24', hex: '#152d24' },
                    { name: 'Forest 800', value: '#0f1f19', hex: '#0f1f19' },
                    { name: 'Forest 900', value: '#0a140f', hex: '#0a140f' },
                  ].map((color) => (
                    <div key={color.name} className="space-y-2">
                      <div 
                        className="h-20 rounded-xl border border-gray-200 shadow-sm"
                        style={{ backgroundColor: color.hex }}
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{color.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{color.hex}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Accent Colors */}
              <div className="mb-8">
                <h3 className="font-bold text-gray-900 mb-4">Accent - Teal</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {[
                    { name: 'Teal 50', value: '#f0fdfa', hex: '#f0fdfa' },
                    { name: 'Teal 100', value: '#ccfbf1', hex: '#ccfbf1' },
                    { name: 'Teal 200', value: '#99f6e4', hex: '#99f6e4' },
                    { name: 'Teal 300', value: '#5eead4', hex: '#5eead4' },
                    { name: 'Teal 400', value: '#2dd4bf', hex: '#2dd4bf' },
                    { name: 'Teal 500', value: '#14b8a6', hex: '#14b8a6' },
                    { name: 'Teal 600', value: '#0d9488', hex: '#0d9488' },
                    { name: 'Teal 700', value: '#0f766e', hex: '#0f766e' },
                    { name: 'Teal 800', value: '#115e59', hex: '#115e59' },
                    { name: 'Teal 900', value: '#134e4a', hex: '#134e4a' },
                  ].map((color) => (
                    <div key={color.name} className="space-y-2">
                      <div 
                        className="h-20 rounded-xl border border-gray-200 shadow-sm"
                        style={{ backgroundColor: color.hex }}
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{color.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{color.hex}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Semantic Colors */}
              <div>
                <h3 className="font-bold text-gray-900 mb-4">Semantic Colors</h3>
                <div className="grid md:grid-cols-4 gap-4">
                  {[
                    { name: 'Success', hex: '#10b981', desc: 'Positive actions and confirmations' },
                    { name: 'Warning', hex: '#f59e0b', desc: 'Caution and alerts' },
                    { name: 'Error', hex: '#ef4444', desc: 'Errors and destructive actions' },
                    { name: 'Info', hex: '#3b82f6', desc: 'Information and neutral states' },
                  ].map((color) => (
                    <div key={color.name} className="bg-white p-4 rounded-xl border border-gray-200">
                      <div 
                        className="h-16 rounded-lg mb-3"
                        style={{ backgroundColor: color.hex }}
                      />
                      <h4 className="font-semibold text-gray-900">{color.name}</h4>
                      <p className="text-xs text-gray-500 font-mono mb-2">{color.hex}</p>
                      <p className="text-sm text-gray-600">{color.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Typography Tab */}
        {activeTab === 'typography' && (
          <div className="space-y-8">
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Typography</h2>
              <p className="text-gray-600 mb-8">Clean, readable sans-serif type system optimized for web interfaces.</p>
              
              <div className="bg-white p-8 rounded-2xl border border-gray-200 space-y-8">
                <div>
                  <h3 className="font-bold text-gray-900 mb-4">Font Family</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">Primary: System UI Sans</p>
                      <p className="text-2xl">The quick brown fox jumps over the lazy dog</p>
                      <p className="text-xs text-gray-500 mt-2 font-mono">font-family: system-ui, -apple-system, sans-serif</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-4">Type Scale</h3>
                  <div className="space-y-6">
                    <div className="flex items-baseline gap-4">
                      <div className="w-32 text-sm text-gray-600">Display</div>
                      <div className="flex-1">
                        <p className="text-6xl font-bold text-gray-900">Shepherd AI</p>
                        <p className="text-xs text-gray-500 mt-2">60px / 72px • Bold</p>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-4">
                      <div className="w-32 text-sm text-gray-600">H1</div>
                      <div className="flex-1">
                        <p className="text-5xl font-bold text-gray-900">Welcome Back</p>
                        <p className="text-xs text-gray-500 mt-2">48px / 56px • Bold</p>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-4">
                      <div className="w-32 text-sm text-gray-600">H2</div>
                      <div className="flex-1">
                        <p className="text-4xl font-bold text-gray-900">Login to Dashboard</p>
                        <p className="text-xs text-gray-500 mt-2">36px / 44px • Bold</p>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-4">
                      <div className="w-32 text-sm text-gray-600">H3</div>
                      <div className="flex-1">
                        <p className="text-3xl font-bold text-gray-900">Design System</p>
                        <p className="text-xs text-gray-500 mt-2">30px / 36px • Bold</p>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-4">
                      <div className="w-32 text-sm text-gray-600">H4</div>
                      <div className="flex-1">
                        <p className="text-2xl font-bold text-gray-900">Components</p>
                        <p className="text-xs text-gray-500 mt-2">24px / 32px • Bold</p>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-4">
                      <div className="w-32 text-sm text-gray-600">Body Large</div>
                      <div className="flex-1">
                        <p className="text-lg text-gray-900">The quick brown fox jumps over the lazy dog</p>
                        <p className="text-xs text-gray-500 mt-2">18px / 28px • Regular</p>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-4">
                      <div className="w-32 text-sm text-gray-600">Body</div>
                      <div className="flex-1">
                        <p className="text-base text-gray-900">The quick brown fox jumps over the lazy dog</p>
                        <p className="text-xs text-gray-500 mt-2">16px / 24px • Regular</p>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-4">
                      <div className="w-32 text-sm text-gray-600">Body Small</div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">The quick brown fox jumps over the lazy dog</p>
                        <p className="text-xs text-gray-500 mt-2">14px / 20px • Regular</p>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-4">
                      <div className="w-32 text-sm text-gray-600">Caption</div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-900">The quick brown fox jumps over the lazy dog</p>
                        <p className="text-xs text-gray-500 mt-2">12px / 16px • Regular</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-4">Font Weights</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-normal">Regular</p>
                      <p className="text-xs text-gray-500 mt-2">400</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-medium">Medium</p>
                      <p className="text-xs text-gray-500 mt-2">500</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold">Bold</p>
                      <p className="text-xs text-gray-500 mt-2">700</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Spacing Tab */}
        {activeTab === 'spacing' && (
          <div className="space-y-8">
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Spacing System</h2>
              <p className="text-gray-600 mb-8">Consistent 4px-based spacing scale for layout and component padding.</p>
              
              <div className="bg-white p-8 rounded-2xl border border-gray-200">
                <div className="space-y-6">
                  {[
                    { name: '0.5', px: '2px', value: '0.125rem' },
                    { name: '1', px: '4px', value: '0.25rem' },
                    { name: '2', px: '8px', value: '0.5rem' },
                    { name: '3', px: '12px', value: '0.75rem' },
                    { name: '4', px: '16px', value: '1rem' },
                    { name: '5', px: '20px', value: '1.25rem' },
                    { name: '6', px: '24px', value: '1.5rem' },
                    { name: '8', px: '32px', value: '2rem' },
                    { name: '10', px: '40px', value: '2.5rem' },
                    { name: '12', px: '48px', value: '3rem' },
                    { name: '16', px: '64px', value: '4rem' },
                    { name: '20', px: '80px', value: '5rem' },
                    { name: '24', px: '96px', value: '6rem' },
                  ].map((space) => (
                    <div key={space.name} className="flex items-center gap-4">
                      <div className="w-16 text-sm font-mono text-gray-600">{space.name}</div>
                      <div className="w-24 text-sm text-gray-600">{space.px}</div>
                      <div className="flex-1">
                        <div 
                          className="bg-teal-500 h-8 rounded"
                          style={{ width: space.px }}
                        />
                      </div>
                      <div className="w-32 text-sm font-mono text-gray-500">{space.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 bg-white p-8 rounded-2xl border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-4">Border Radius</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    { name: 'Small', value: '0.375rem', px: '6px', radius: '6px' },
                    { name: 'Medium', value: '0.5rem', px: '8px', radius: '8px' },
                    { name: 'Large', value: '0.75rem', px: '12px', radius: '12px' },
                    { name: 'XL', value: '1rem', px: '16px', radius: '16px' },
                    { name: '2XL', value: '1.5rem', px: '24px', radius: '24px' },
                    { name: 'Full', value: '9999px', px: '∞', radius: '9999px' },
                  ].map((r) => (
                    <div key={r.name} className="space-y-3">
                      <div 
                        className="h-24 bg-teal-500"
                        style={{ borderRadius: r.radius }}
                      />
                      <div>
                        <p className="font-medium text-gray-900">{r.name}</p>
                        <p className="text-sm text-gray-500">{r.px} / {r.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Components Tab */}
        {activeTab === 'components' && (
          <div className="space-y-12">
            {/* Buttons */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Buttons</h2>
              <div className="bg-white p-8 rounded-2xl border border-gray-200 space-y-8">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Primary Button</h3>
                  <div className="flex flex-wrap items-center gap-4">
                    <button className="h-12 px-8 rounded-full bg-teal-500 hover:bg-teal-600 text-white font-medium transition-colors">
                      Login to Dashboard
                    </button>
                    <button className="h-10 px-6 rounded-full bg-teal-500 hover:bg-teal-600 text-white font-medium transition-colors">
                      Medium Button
                    </button>
                    <button className="h-8 px-4 rounded-full bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium transition-colors">
                      Small Button
                    </button>
                    <button className="h-12 px-8 rounded-full bg-teal-500 text-white font-medium opacity-50 cursor-not-allowed">
                      Disabled
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Secondary Button</h3>
                  <div className="flex flex-wrap items-center gap-4">
                    <button className="h-12 px-8 rounded-full bg-white hover:bg-gray-50 text-gray-700 font-medium border border-gray-300 transition-colors">
                      Secondary Action
                    </button>
                    <button className="h-10 px-6 rounded-full bg-white hover:bg-gray-50 text-gray-700 font-medium border border-gray-300 transition-colors">
                      Medium
                    </button>
                    <button className="h-8 px-4 rounded-full bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium border border-gray-300 transition-colors">
                      Small
                    </button>
                  </div>
                </div>

                <div className="bg-[#1e4d3c] p-6 rounded-xl">
                  <h3 className="font-semibold text-white mb-4">On Dark Background</h3>
                  <div className="flex flex-wrap items-center gap-4">
                    <button className="h-12 px-8 rounded-full bg-teal-500 hover:bg-teal-600 text-white font-medium transition-colors">
                      Primary
                    </button>
                    <button className="h-12 px-8 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium border border-white/20 transition-colors">
                      Secondary
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Icon Buttons</h3>
                  <div className="flex flex-wrap items-center gap-4">
                    <button className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-gray-300 flex items-center justify-center transition-colors">
                      <Chrome className="size-5 text-gray-700" />
                    </button>
                    <button className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-gray-300 flex items-center justify-center transition-colors">
                      <Apple className="size-5 text-gray-700" />
                    </button>
                    <button className="w-10 h-10 rounded-full bg-teal-500 hover:bg-teal-600 text-white flex items-center justify-center transition-colors">
                      <Check className="size-5" />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Form Inputs */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Form Inputs</h2>
              <div className="bg-white p-8 rounded-2xl border border-gray-200 space-y-8">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Text Inputs</h3>
                  <div className="space-y-4 max-w-md">
                    <div className="space-y-2">
                      <Label htmlFor="demo-email" className="text-gray-700">Email</Label>
                      <Input
                        id="demo-email"
                        type="email"
                        placeholder="Enter your email"
                        className="h-12 rounded-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="demo-name" className="text-gray-700">Full Name</Label>
                      <Input
                        id="demo-name"
                        type="text"
                        placeholder="John Doe"
                        className="h-12 rounded-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="demo-disabled" className="text-gray-700">Disabled</Label>
                      <Input
                        id="demo-disabled"
                        type="text"
                        placeholder="Disabled input"
                        disabled
                        className="h-12 rounded-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-[#1e4d3c] p-6 rounded-xl">
                  <h3 className="font-semibold text-white mb-4">On Dark Background</h3>
                  <div className="space-y-4 max-w-md">
                    <div className="space-y-2">
                      <Label htmlFor="dark-email" className="text-teal-100">Username</Label>
                      <Input
                        id="dark-email"
                        type="email"
                        placeholder="Enter your username"
                        className="h-12 rounded-full bg-black/20 border-black/30 text-white placeholder:text-gray-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dark-password" className="text-teal-100">Password</Label>
                      <div className="relative">
                        <Input
                          id="dark-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          className="h-12 rounded-full bg-black/20 border-black/30 text-white placeholder:text-gray-400 pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Checkboxes */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Checkboxes & Radio</h2>
              <div className="bg-white p-8 rounded-2xl border border-gray-200 space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Checkboxes</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="check1"
                        checked={checked}
                        onCheckedChange={(c) => setChecked(c as boolean)}
                      />
                      <Label htmlFor="check1" className="text-gray-700 cursor-pointer">
                        Remember Me
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="check2" />
                      <Label htmlFor="check2" className="text-gray-700 cursor-pointer">
                        Subscribe to newsletter
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="check3" disabled />
                      <Label htmlFor="check3" className="text-gray-400 cursor-not-allowed">
                        Disabled option
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1e4d3c] p-6 rounded-xl">
                  <h3 className="font-semibold text-white mb-4">On Dark Background</h3>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="dark-check"
                      className="border-gray-400 data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
                    />
                    <Label htmlFor="dark-check" className="text-teal-100 cursor-pointer">
                      Remember Me
                    </Label>
                  </div>
                </div>
              </div>
            </section>

            {/* Links */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Links & Navigation</h2>
              <div className="bg-white p-8 rounded-2xl border border-gray-200 space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Text Links</h3>
                  <div className="space-y-3">
                    <div>
                      <a href="#" className="text-teal-600 hover:text-teal-700 font-medium transition-colors">
                        Primary Link
                      </a>
                    </div>
                    <div>
                      <a href="#" className="text-teal-600 hover:text-teal-700 font-medium underline transition-colors">
                        Underlined Link
                      </a>
                    </div>
                    <div>
                      <a href="#" className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                        Secondary Link
                      </a>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1e4d3c] p-6 rounded-xl">
                  <h3 className="font-semibold text-white mb-4">On Dark Background</h3>
                  <div className="space-y-3">
                    <div>
                      <a href="#" className="text-teal-300 hover:text-teal-200 transition-colors">
                        Forgot Password?
                      </a>
                    </div>
                    <div>
                      <a href="#" className="text-teal-300 hover:text-teal-200 underline transition-colors">
                        Register Now
                      </a>
                    </div>
                    <div>
                      <a href="#" className="text-teal-300/70 hover:text-teal-200 text-xs transition-colors">
                        Privacy Policy
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Cards */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Cards & Containers</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Standard Card</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    White background with subtle border and large border radius (24px).
                  </p>
                  <button className="h-10 px-6 rounded-full bg-teal-500 hover:bg-teal-600 text-white font-medium transition-colors">
                    Action
                  </button>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Elevated Card</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Shadow-based elevation with 32px border radius for prominence.
                  </p>
                  <button className="h-10 px-6 rounded-full bg-teal-500 hover:bg-teal-600 text-white font-medium transition-colors">
                    Action
                  </button>
                </div>

                <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-6 rounded-2xl text-white">
                  <h3 className="font-semibold mb-2">Gradient Card</h3>
                  <p className="text-teal-50 text-sm mb-4">
                    Accent gradient for highlighting important content or CTAs.
                  </p>
                  <button className="h-10 px-6 rounded-full bg-white text-teal-600 hover:bg-teal-50 font-medium transition-colors">
                    Action
                  </button>
                </div>

                <div className="bg-[#1e4d3c] p-6 rounded-2xl text-white">
                  <h3 className="font-semibold mb-2">Dark Card</h3>
                  <p className="text-teal-100 text-sm mb-4">
                    Forest green background for dark mode or contrast sections.
                  </p>
                  <button className="h-10 px-6 rounded-full bg-teal-500 hover:bg-teal-600 text-white font-medium transition-colors">
                    Action
                  </button>
                </div>
              </div>
            </section>

            {/* Alerts & Messages */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Alerts & Messages</h2>
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-medium text-green-900 mb-1">Success</h4>
                    <p className="text-sm text-green-700">Your changes have been saved successfully.</p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
                  <Info className="size-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">Information</h4>
                    <p className="text-sm text-blue-700">Please verify your email address to continue.</p>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex items-start gap-3">
                  <AlertCircle className="size-5 text-yellow-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-medium text-yellow-900 mb-1">Warning</h4>
                    <p className="text-sm text-yellow-700">This action cannot be undone. Please proceed with caution.</p>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3">
                  <XCircle className="size-5 text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-medium text-red-900 mb-1">Error</h4>
                    <p className="text-sm text-red-700">Invalid credentials. Please check your email and password.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Dividers */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Dividers</h2>
              <div className="bg-white p-8 rounded-2xl border border-gray-200 space-y-8">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Horizontal Divider</h3>
                  <div className="border-t border-gray-200" />
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Text Divider</h3>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500">Or continue with</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1e4d3c] p-6 rounded-xl">
                  <h3 className="font-semibold text-white mb-4">On Dark Background</h3>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/20" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-[#1e4d3c] text-teal-200">Or continue with</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              © 2025 Shepherd AI Design System • v1.0.0
            </div>
            <div className="flex items-center gap-4 text-sm">
              <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Documentation</a>
              <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">GitHub</a>
              <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}