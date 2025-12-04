import { useState, useEffect } from "react";
import { ShoppingCart, Package, TrendingUp, Users, Zap, Shield, BarChart3 } from "lucide-react";
import "../App.css";

export const SplashScreen = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [animationStage, setAnimationStage] = useState(0);
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, size: number}>>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 5000); // Hide splash screen after 5 seconds

    // Staggered animations
    const stage1 = setTimeout(() => setAnimationStage(1), 200);
    const stage2 = setTimeout(() => setAnimationStage(2), 500);
    const stage3 = setTimeout(() => setAnimationStage(3), 800);
    const stage4 = setTimeout(() => setAnimationStage(4), 1100);
    const stage5 = setTimeout(() => setAnimationStage(5), 1400);

    // Generate particles for background animation
    const generateParticles = () => {
      const newParticles = [];
      for (let i = 0; i < 30; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 4 + 1
        });
      }
      setParticles(newParticles);
    };

    generateParticles();

    return () => {
      clearTimeout(timer);
      clearTimeout(stage1);
      clearTimeout(stage2);
      clearTimeout(stage3);
      clearTimeout(stage4);
      clearTimeout(stage5);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-background via-primary/5 to-secondary/10 flex items-center justify-center splash-screen overflow-hidden">
      {/* Animated particle background */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full bg-primary/10"
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              top: `${particle.y}%`,
              left: `${particle.x}%`,
              animation: `particle-float ${Math.random() * 6 + 4}s infinite ease-in-out`,
              animationDelay: `${Math.random() * 2}s`,
              opacity: Math.random() * 0.5 + 0.1
            }}
          ></div>
        ))}
      </div>

      {/* Geometric background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 border border-primary/10 rounded-full animate-spin-slow"></div>
        <div className="absolute bottom-1/3 right-1/3 w-48 h-48 border border-secondary/10 rotate-45 animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-32 h-32 bg-primary/5 rounded-lg transform rotate-12 animate-float"></div>
      </div>

      <div className="text-center relative z-10 max-w-4xl mx-auto px-4">
        {/* Advanced logo animation */}
        <div className="mb-10 relative">
          {/* Outer ring with rotation */}
          <div className={`absolute inset-0 rounded-full border-2 border-primary/20 animate-spin-slow ${animationStage >= 1 ? 'opacity-100' : 'opacity-0'}`}></div>
          
          {/* Inner pulsing ring */}
          <div className={`absolute inset-4 rounded-full border border-primary/30 animate-ping ${animationStage >= 1 ? 'opacity-70' : 'opacity-0'}`}></div>
          
          {/* Main logo container with 3D effect */}
          <div className={`relative bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-8 shadow-2xl backdrop-blur-sm transform transition-all duration-700 ${animationStage >= 2 ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
            <div className="relative z-10">
              <ShoppingCart className="h-20 w-20 text-white mx-auto" />
            </div>
            
            {/* Floating corner icons */}
            <div className={`absolute -top-4 -left-4 transition-all duration-500 ${animationStage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <Package className="h-8 w-8 text-white/80" />
            </div>
            <div className={`absolute -bottom-4 -right-4 transition-all duration-500 delay-100 ${animationStage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <TrendingUp className="h-8 w-8 text-white/80" />
            </div>
            <div className={`absolute -top-4 -right-4 transition-all duration-500 delay-200 ${animationStage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <Users className="h-8 w-8 text-white/80" />
            </div>
            <div className={`absolute -bottom-4 -left-4 transition-all duration-500 delay-300 ${animationStage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <BarChart3 className="h-8 w-8 text-white/80" />
            </div>
          </div>
        </div>

        {/* Brand name with advanced typography */}
        <div className={`mb-6 transition-all duration-700 delay-300 ${animationStage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-4">
            <span className="bg-gradient-to-r from-primary via-primary/90 to-primary bg-clip-text text-transparent">
              KILANGO
            </span>
            <span className="block text-2xl md:text-3xl font-light text-muted-foreground mt-2">
              Group Food Suppliers & General
            </span>
          </h1>
        </div>

        {/* Advanced tagline with animated underline */}
        <div className={`mb-10 transition-all duration-700 delay-500 ${animationStage >= 4 ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-xl md:text-2xl font-medium text-foreground/90 mb-4">
            Digital Business Solutions for Modern Enterprises
          </p>
          
          {/* Animated underline */}
          <div className="w-32 h-1 bg-gradient-to-r from-primary via-secondary to-primary mx-auto rounded-full relative overflow-hidden">
            <div className="absolute inset-0 bg-white/30 animate-shimmer"></div>
          </div>
        </div>

        {/* Feature showcase with advanced animations */}
        <div className={`mb-12 transition-all duration-700 delay-700 ${animationStage >= 5 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {[
              { icon: Zap, label: "Lightning Fast" },
              { icon: Shield, label: "Secure" },
              { icon: BarChart3, label: "Analytics" },
              { icon: Package, label: "Inventory" }
            ].map((item, index) => (
              <div 
                key={index}
                className="flex flex-col items-center p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 group"
                style={{ 
                  animationDelay: `${0.1 * index}s`,
                  transform: animationStage >= 5 ? 'translateY(0)' : 'translateY(20px)',
                  opacity: animationStage >= 5 ? 1 : 0
                }}
              >
                <item.icon className="h-6 w-6 text-primary mb-2 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-sm font-medium text-foreground/80">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Advanced loading indicator */}
        <div className={`flex flex-col items-center transition-all duration-700 delay-1000 ${animationStage >= 5 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex space-x-2 mb-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-2 w-2 bg-primary rounded-full"
                style={{
                  animation: `pulse 1.4s infinite`,
                  animationDelay: `${0.15 * i}s`
                }}
              ></div>
            ))}
          </div>
          <span className="text-sm text-muted-foreground font-medium tracking-wider uppercase">
            Initializing System
          </span>
        </div>
      </div>
    </div>
  );
};