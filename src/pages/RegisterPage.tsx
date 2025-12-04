import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { createUser } from "@/services/databaseService";

interface RegisterPageProps {
  onBack?: () => void;
}

const RegisterPage = ({ onBack }: RegisterPageProps) => {
  console.log("RegisterPage rendered with onBack:", onBack);
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { signUp } = useAuth();

  const validateForm = () => {
    if (!firstName.trim()) {
      toast({
        title: "Error",
        description: "First name is required",
        variant: "destructive",
      });
      return false;
    }

    if (!lastName.trim()) {
      toast({
        title: "Error",
        description: "Last name is required",
        variant: "destructive",
      });
      return false;
    }

    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Email is required",
        variant: "destructive",
      });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return false;
    }

    if (!password) {
      toast({
        title: "Error",
        description: "Password is required",
        variant: "destructive",
      });
      return false;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return false;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submission triggered");
    
    if (!validateForm()) {
      console.log("Form validation failed");
      return;
    }

    console.log("Form validation passed");
    setIsLoading(true);
    
    try {
      // Sign up the user with Supabase auth, including user metadata
      const userData = {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
      };

      console.log("Attempting to sign up user with email:", email);
      const result = await signUp(email, password, userData);
      console.log("Sign up result:", result);
      
      if (result.error) {
        console.error("Sign up error:", result.error);
        toast({
          title: "Error",
          description: result.error.message || "Failed to create account",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // If sign up is successful, create the user record in the database
      if (result.user) {
        console.log("User signed up successfully, creating database record");
        const dbUserData = {
          id: result.user.id,
          username: email.split("@")[0],
          email: email,
          first_name: firstName,
          last_name: lastName,
          role: "staff", // Default role
          is_active: true,
        };

        const dbUser = await createUser(dbUserData);
        
        if (!dbUser) {
          console.warn("Failed to create user record in database");
          // We still proceed as the auth user was created successfully
        }

        toast({
          title: "Success",
          description: "Account created successfully! Please check your email for confirmation.",
        });
        
        // Redirect to login page after a short delay
        setTimeout(() => {
          if (onBack) {
            onBack();
          } else {
            window.location.href = "/";
          }
        }, 2000);
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during registration",
        variant: "destructive",
      });
    } finally {
      console.log("Registration process completed");
      setIsLoading(false);
    }
  };

  const handleSignInClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Sign in link clicked, onBack:", onBack);
    if (onBack) {
      onBack();
    } else {
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 relative register-page">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-4 sm:pb-6">
          <div className="mx-auto mb-3 sm:mb-4 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-primary">
            <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold">Create Account</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Sign up for Kilango Group POS System
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6 sm:pb-8">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm sm:text-base">First Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Enter your first name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="pl-10 py-5 sm:py-6 text-sm sm:text-base"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm sm:text-base">Last Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Enter your last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="pl-10 py-5 sm:py-6 text-sm sm:text-base"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm sm:text-base">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 py-5 sm:py-6 text-sm sm:text-base"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm sm:text-base">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 py-5 sm:py-6 text-sm sm:text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Password must be at least 6 characters</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm sm:text-base">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10 py-5 sm:py-6 text-sm sm:text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-muted-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-10 sm:h-12 text-sm sm:text-base"
              disabled={isLoading}
              onClick={() => console.log("Sign up button clicked")}
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <Button 
              variant="link" 
              className="text-sm p-0 h-auto font-medium text-primary hover:underline signup-link"
              onClick={handleSignInClick}
            >
              Already have an account? Sign In
            </Button>
          </div>
          
          <div className="mt-4 text-center">
            <Button variant="link" className="text-xs">
              Haki zote zimehifadhiwa  🌍
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterPage;