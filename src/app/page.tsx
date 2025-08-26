"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Store, Building2, ShieldCheck, ArrowRight, CheckCircle, LayoutList, Sparkles, Zap, Users, Award, FileText, Clock, CheckCircle2, Shield } from "lucide-react";
import Button from "@/components/ui/Button";

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function check() {
      setChecking(true);
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!data.user) {
        setChecking(false);
      } else {
        router.replace("/dashboard");
      }
    }
    check();
    return () => { mounted = false; };
  }, [router]);

  if (checking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-6"></div>
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  const permitTypes = [
    {
      title: "Business Permit",
      description: "Apply for new or renewal of business permits",
      icon: Store,
      href: "/apply/business",
      color: "blue",
      features: ["New business registration", "Annual renewal", "Business expansion"],
      gradient: "from-blue-500 to-cyan-500",
      requirements: ["Valid ID", "Business registration", "Location clearance"],
    },
    {
      title: "Building Permit",
      description: "Apply for construction and renovation permits",
      icon: Building2,
      href: "/apply/building",
      color: "emerald",
      features: ["New construction", "Renovation", "Structural changes"],
      gradient: "from-emerald-500 to-teal-500",
      requirements: ["Architectural plans", "Structural plans", "Site survey"],
    },
    {
      title: "Barangay Clearance",
      description: "Request barangay clearance certificates",
      icon: ShieldCheck,
      href: "/apply/barangay",
      color: "orange",
      features: ["Residency clearance", "Good moral character", "Local requirements"],
      gradient: "from-orange-500 to-amber-500",
      requirements: ["Residency proof", "Community service", "Local endorsement"],
    },
  ];

  const benefits = [
    { text: "24/7 online application", icon: Clock, description: "Apply anytime, anywhere" },
    { text: "Real-time status tracking", icon: CheckCircle2, description: "Monitor your application progress" },
    { text: "Secure document upload", icon: ShieldCheck, description: "Your documents are safe with us" },
    { text: "Digital payment processing", icon: Award, description: "Convenient online payments" },
    { text: "SMS notifications", icon: Users, description: "Stay updated via text messages" },
    { text: "Mobile-friendly interface", icon: LayoutList, description: "Works perfectly on all devices" },
  ];

  const stats = [
    { number: "1000+", label: "Applications Processed", icon: FileText },
    { number: "24hrs", label: "Average Processing Time", icon: Clock },
    { number: "99%", label: "Satisfaction Rate", icon: CheckCircle },
    { number: "24/7", label: "Online Support", icon: Users },
  ];

  return (
    <div className="min-h-screen gradient-bg">
      {/* Hero Section */}
      <section className="section-padding text-center relative overflow-hidden">
        <div className="container-max">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/20 to-cyan-400/20 rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10 space-y-8">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-white/20 rounded-full text-sm font-medium text-gray-700 shadow-lg">
                <Sparkles className="h-4 w-4 text-blue-500" />
                Official City Government Portal
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-balance">
                Welcome to{" "}
                <span className="gradient-text">Dipolog City Permits</span>
              </h1>
              
              <p className="mx-auto max-w-3xl text-xl text-gray-600 leading-relaxed">
                Streamlined permit application system for Dipolog City. Apply for business permits, 
                building permits, and barangay clearances online. Experience efficient, transparent, 
                and secure public service.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" className="btn-primary text-lg px-8 py-4">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/apply/business">
                <Button variant="outline" size="lg" className="btn-secondary text-lg px-8 py-4">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="section-padding">
        <div className="container-max">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="text-center">
                  <div className="glass-card rounded-2xl p-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 mb-4">
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-2">{stat.number}</div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Permit Types */}
      <section className="section-padding">
        <div className="container-max">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">Available Services</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose from our comprehensive range of permit and clearance services. 
              Each service is designed to meet your specific needs with clear requirements and processes.
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {permitTypes.map((permit, index) => {
              const Icon = permit.icon;
              
              return (
                <div key={permit.title} className="glass-card glass-card-hover h-full p-8 space-y-6 rounded-2xl">
                  <div className="flex items-start justify-between">
                    <div className={`rounded-2xl p-4 bg-gradient-to-br ${permit.gradient} shadow-lg`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold text-gray-900">{permit.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{permit.description}</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">What's Included:</h4>
                      <ul className="space-y-2">
                        {permit.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-3 text-sm text-gray-600">
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Requirements:</h4>
                      <ul className="space-y-2">
                        {permit.requirements.map((req) => (
                          <li key={req} className="flex items-center gap-3 text-sm text-gray-600">
                            <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  <Link href={permit.href}>
                    <Button className="w-full btn-primary">
                      Apply Now
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="section-padding">
        <div className="container-max">
          <div className="glass-card rounded-3xl p-12">
            <div className="text-center space-y-8 mb-12">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900">Why Choose Our System?</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Experience the benefits of our modern, user-friendly platform designed to make 
                permit applications effortless and transparent.
              </p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <div key={benefit.text} className="flex items-start gap-4 p-6 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/20 hover:bg-white/80 transition-all duration-300">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg flex-shrink-0">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">{benefit.text}</h3>
                      <p className="text-sm text-gray-600">{benefit.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="section-padding">
        <div className="container-max text-center space-y-8">
          <div className="glass-card rounded-3xl p-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Ready to Get Started?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Join thousands of residents and businesses who have already streamlined their 
              permit applications with our system.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button className="btn-primary text-lg px-8 py-4">
                  <Shield className="mr-2 h-5 w-5" />
                  Create Account
                </Button>
              </Link>
              <Link href="/apply/business">
                <Button variant="outline" className="btn-secondary text-lg px-8 py-4">
                  <FileText className="mr-2 h-5 w-5" />
                  View Requirements
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
