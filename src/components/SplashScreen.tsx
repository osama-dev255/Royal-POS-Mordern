import { useState, useEffect } from "react";
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  BarChart3, 
  Building, 
  Globe, 
  CreditCard, 
  PieChart, 
  Target,
  Activity
} from "lucide-react";
import "../App.css";

export const SplashScreen = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [businessMetrics, setBusinessMetrics] = useState({
    revenue: 0,
    customers: 0,
    orders: 0,
    growth: 0
  });
  const [activeChart, setActiveChart] = useState(0);

  useEffect(() => {
    // Simulate business metrics loading
    const metricInterval = setInterval(() => {
      setBusinessMetrics(prev => ({
        revenue: Math.min(1000000, prev.revenue + 5000),
        customers: Math.min(10000, prev.customers + 5),
        orders: Math.min(50000, prev.orders + 10),
        growth: Math.min(98, prev.growth + 0.5)
      }));
    }, 50);

    // Auto-hide after 4 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 4000);

    return () => {
      clearInterval(metricInterval);
      clearTimeout(timer);
    };
  }, []);



  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-blue-50/20 to-emerald-50/30 flex items-center justify-center splash-screen overflow-hidden">

      


      {/* Central Business Hub */}
      <div className="relative z-20 text-center max-w-4xl px-4">
        {/* Business Growth Animation */}
        <div className="mb-10 relative flex justify-center">
          <div className="relative w-72 h-72 flex items-center justify-center">
            {/* Business ecosystem ring */}
            <div className="absolute w-full h-full rounded-full bg-gradient-to-r from-green-500/10 via-blue-500/10 to-emerald-500/10 animate-spin-slower"></div>
            
            {/* Market expansion rings */}
            <div className="absolute w-5/6 h-5/6 rounded-full border-2 border-green-400/30 animate-spin-slow"></div>
            <div className="absolute w-4/6 h-4/6 rounded-full border-2 border-blue-400/30 animate-pulse-slow"></div>
            <div className="absolute w-3/6 h-3/6 rounded-full border-2 border-emerald-400/30 animate-spin"></div>
            
            {/* Central business hub */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              <div className="relative">
                <Building className="h-20 w-20 text-green-600 animate-pulse" />
                
                {/* Market growth indicators */}
                {[0, 1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 bg-green-500 rounded-full"
                    style={{
                      transform: `rotate(${i * 90 + businessMetrics.growth}deg) translate(50px) rotate(${-i * 90 - businessMetrics.growth}deg)`,
                      boxShadow: '0 0 8px rgba(34, 197, 94, 0.8)'
                    }}
                  />
                ))}
                
                {/* Global reach */}
                <div className="absolute -inset-4 rounded-full border border-green-400/20 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Business Branding */}
        <div className="mb-8 relative">
          <h1 className="text-7xl md:text-8xl lg:text-9xl font-black mb-4 relative">
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-green-600 via-blue-600 to-emerald-600 animate-text-shine">
              KILANGO
            </span>
            <div className="absolute -inset-2 bg-gradient-to-r from-green-500 to-emerald-500 blur-xl opacity-20 animate-pulse"></div>
          </h1>
          <p className="text-2xl md:text-3xl text-slate-700/90 tracking-widest font-light">
            INVESTMENT LTD
          </p>
        </div>

        {/* Business Metrics Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { icon: DollarSign, label: "REVENUE", value: `$${Math.floor(businessMetrics.revenue).toLocaleString()}`, color: "text-green-600" },
            { icon: Users, label: "CUSTOMERS", value: Math.floor(businessMetrics.customers).toLocaleString(), color: "text-blue-600" },
            { icon: ShoppingCart, label: "ORDERS", value: Math.floor(businessMetrics.orders).toLocaleString(), color: "text-purple-600" },
            { icon: TrendingUp, label: "GROWTH", value: `${Math.floor(businessMetrics.growth)}%`, color: "text-amber-600" }
          ].map((metric, index) => (
            <div 
              key={index}
              className="bg-white/60 backdrop-blur-sm border border-green-500/30 rounded-xl p-4 transition-all duration-700 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-green-500/20"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <metric.icon className={`h-10 w-10 ${metric.color} mx-auto mb-2 animate-pulse`} />
              <div className="text-xs text-slate-600/80 uppercase tracking-wider">{metric.label}</div>
              <div className={`text-xl font-bold ${metric.color}`}>{metric.value}</div>
            </div>
          ))}
        </div>

        {/* Business Performance Bar */}
        <div className="relative w-full max-w-2xl mx-auto mb-8">
          <div className="h-4 bg-slate-200 rounded-full overflow-hidden border border-green-500/30">
            <div 
              className="h-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${businessMetrics.growth}%` }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer"></div>
          </div>
          <div className="text-sm text-slate-700/90 mt-2 uppercase tracking-wider flex justify-between">
            <span>BUSINESS PERFORMANCE</span>
            <span>{Math.round(businessMetrics.growth)}%</span>
          </div>
        </div>

        {/* Business Capabilities */}
        <div className="flex items-center justify-center space-x-10 text-slate-700/70">
          <div className="flex items-center space-x-2">
            <PieChart className="h-5 w-5 text-green-600" />
            <span className="text-sm uppercase tracking-wider">ANALYTICS</span>
          </div>
          <div className="flex items-center space-x-2">
            <Globe className="h-5 w-5 text-blue-600" />
            <span className="text-sm uppercase tracking-wider">GLOBAL REACH</span>
          </div>
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-purple-600" />
            <span className="text-sm uppercase tracking-wider">REAL-TIME</span>
          </div>
        </div>
      </div>

      {/* Business Nodes */}
      {[...Array(15)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-green-500 rounded-full opacity-40"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `particle-drift ${4 + Math.random() * 3}s infinite linear`,
            animationDelay: `${Math.random() * 2}s`,
            boxShadow: '0 0 5px rgba(34, 197, 94, 0.5)'
          }}
        />
      ))}
    </div>
  );
};