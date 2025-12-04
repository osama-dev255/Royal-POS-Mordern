import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Lock, User, Eye, EyeOff, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
// Import Supabase auth service
import { signIn } from "@/services/authService";

interface LoginFormProps {
  onLogin: (credentials: { username: string; password: string }) => void;
  onNavigate?: (destination: string) => void;
}

export const LoginForm = ({ onLogin, onNavigate }: LoginFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const validateForm = () => {
    let isValid = true;
    const newErrors = { email: "", password: "" };

    if (!email) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email address is invalid";
      isValid = false;
    }

    if (!password) {
      newErrors.password = "Password is required";
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      // Try Supabase authentication first
      const result = await signIn(email, password);
      
      if (result.error) {
        // Handle specific email confirmation error
        if (result.error.message && result.error.message.includes('Email not confirmed')) {
          toast({
            title: "Email Confirmation Required",
            description: "Please check your email and click the confirmation link before logging in.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        
        // Show error message instead of falling back to mock authentication
        toast({
          title: "Authentication Error",
          description: result.error.message || "Failed to authenticate. Please check your credentials and try again.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      } else {
        // Supabase auth successful
        onLogin({ username: email, password });
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Authentication error:", error);
      toast({
        title: "Error",
        description: "Authentication failed. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleRegisterClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onNavigate) {
      onNavigate("register");
    } else {
      // Fallback to hash-based navigation
      window.location.hash = "#register";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%]">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-primary/5"
              style={{
                width: Math.random() * 100 + 20,
                height: Math.random() * 100 + 20,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                x: [0, Math.random() * 20 - 10, 0],
              }}
              transition={{
                duration: Math.random() * 5 + 5,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: isMounted ? 1 : 0, y: isMounted ? 0 : 20 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <Card className="shadow-xl border-0 bg-background/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-6 pt-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"
            >
              <Building2 className="h-8 w-8 text-primary" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Kilango Group
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Sign in to access your business dashboard
              </CardDescription>
            </motion.div>
          </CardHeader>
          
          <CardContent className="pb-8 px-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <Label htmlFor="email" className="text-base font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors(prev => ({ ...prev, email: "" }));
                    }}
                    className={`pl-12 pr-4 py-6 text-base rounded-xl border-2 transition-all duration-200 ${
                      errors.email ? "border-destructive" : "border-input focus:border-primary"
                    }`}
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="text-destructive text-sm mt-1"
                  >
                    {errors.email}
                  </motion.p>
                )}
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <Label htmlFor="password" className="text-base font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors(prev => ({ ...prev, password: "" }));
                    }}
                    className={`pl-12 pr-12 py-6 text-base rounded-xl border-2 transition-all duration-200 ${
                      errors.password ? "border-destructive" : "border-input focus:border-primary"
                    }`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="text-destructive text-sm mt-1"
                  >
                    {errors.password}
                  </motion.p>
                )}
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-between"
              >
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="h-5 w-5 border-2 border-white border-t-transparent rounded-full"
                    />
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </motion.div>
            </form>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-8 pt-6 border-t border-muted"
            >
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  Don't have an account? Create one to get started
                </p>
                <Button
                  variant="outline"
                  className="font-medium rounded-xl px-6 py-5 text-base border-2 hover:border-primary hover:bg-primary/5 transition-all duration-300"
                  onClick={handleRegisterClick}
                  disabled={isLoading}
                >
                  <User className="mr-2 h-5 w-5" />
                  Sign Up
                </Button>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-6 text-center"
            >
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground text-sm">
                © {new Date().getFullYear()} Kilango Group. All rights reserved.
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};