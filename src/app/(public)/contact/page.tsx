"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/frontend/components/ui/card";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import { Textarea } from "@/frontend/components/ui/textarea";
import { Mail, MessageSquare, Phone, AlertCircle, ArrowLeft, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function ContactPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });

  const [errors, setErrors] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });

  const limits = {
    name: 100,
    email: 254,
    subject: 200,
    message: 2000
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const fieldName = name as keyof typeof formData;
    
    if (value.length > limits[fieldName]) {
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === "email") {
      if (value && !validateEmail(value)) {
        setErrors(prev => ({
          ...prev,
          email: "Please enter a valid email address"
        }));
      } else {
        setErrors(prev => ({
          ...prev,
          email: ""
        }));
      }
    }

    if (name !== "email" && errors[fieldName as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors = {
      name: "",
      email: "",
      subject: "",
      message: ""
    };

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.subject.trim()) {
      newErrors.subject = "Subject is required";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Message is required";
    }

    setErrors(newErrors);

    const hasErrors = Object.values(newErrors).some(error => error !== "");
    if (!hasErrors) {
      // TODO: Implement actual submission
    }
  };

  const getCharacterCount = (field: keyof typeof formData) => {
    const current = formData[field].length;
    const max = limits[field];
    const isNearLimit = current > max * 0.8;
    const isAtLimit = current >= max;
    
    return {
      current,
      max,
      isNearLimit,
      isAtLimit,
      remaining: max - current
    };
  };

  return (
    <div className="min-h-screen text-foreground bg-background relative overflow-hidden flex flex-col selection:bg-primary selection:text-primary-foreground">
      {/* Navigation */}
      <header className="border-b-4 border-primary bg-background py-4 px-4 md:px-8 flex items-center justify-between sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/iconsvg.svg" alt="Chatlyzer" width={32} height={32} className="w-8 h-8 rounded-none border-2 border-primary shadow-[4px_4px_0px_0px_hsl(var(--primary))] bg-card p-0.5" />
          <span className="font-display font-black text-xl sm:text-2xl tracking-widest uppercase">Chatlyzer</span>
        </Link>

        <Button
          variant="outline"
          onClick={() => router.push("/")}
          className="px-3 sm:px-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Back Home</span>
          <span className="sm:hidden">Back</span>
        </Button>
      </header>

      <main className="flex-1 container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-5xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12 md:mb-16">
            <div className="inline-flex items-center gap-2 border-2 border-primary bg-card text-card-foreground px-4 py-3 mb-10 shadow-[4px_4px_0px_0px_hsl(var(--primary))] font-mono uppercase text-sm font-bold rotate-[1deg]">
              <Sparkles className="w-4 h-4" />
              <span>// Contact Channel Open</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-display font-black uppercase tracking-tighter mb-8 leading-[0.9] text-balance">
              Got Questions?
              <br className="hidden sm:block" />
              <span className="relative inline-block mt-3 bg-primary text-primary-foreground px-4 sm:px-6 py-2 border-4 border-primary shadow-[10px_10px_0px_0px_hsl(var(--foreground))] rotate-[-1deg]">
                Ping Support
              </span>
            </h1>
            
            <p className="text-base md:text-lg font-mono text-muted-foreground uppercase max-w-3xl mx-auto tracking-widest leading-loose bg-card border-2 border-primary p-5 shadow-[6px_6px_0px_0px_hsl(var(--primary))]">
              Drop a note about bugs, billing, analysis results, or account questions. We will route it to the right place.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.8fr] gap-8 items-start">
            {/* Contact Form */}
            <Card className="border-4 shadow-[10px_10px_0px_0px_hsl(var(--primary))]">
              <CardHeader className="border-b-4 border-primary pb-6">
                <CardTitle className="flex items-center gap-3 font-display font-black uppercase tracking-wide text-2xl">
                  <MessageSquare className="h-6 w-6" strokeWidth={3} />
                  Send Message
                </CardTitle>
                <CardDescription className="font-mono uppercase tracking-widest font-bold">
                  Include enough context so we can respond without a long back-and-forth.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="flex items-center justify-between font-mono uppercase text-xs font-black tracking-widest">
                        <span>Name *</span>
                        <span className={getCharacterCount('name').isNearLimit ? 'text-destructive' : 'text-muted-foreground'}>{getCharacterCount('name').current}/{limits.name}</span>
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="Your name"
                        value={formData.name}
                        onChange={handleInputChange}
                        aria-invalid={!!errors.name}
                        required
                      />
                      {errors.name && (
                        <p className="text-xs text-destructive flex items-center gap-1 font-mono uppercase font-bold">
                          <AlertCircle className="h-3 w-3" />
                          {errors.name}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center justify-between font-mono uppercase text-xs font-black tracking-widest">
                        <span>Email *</span>
                        <span className={getCharacterCount('email').isNearLimit ? 'text-destructive' : 'text-muted-foreground'}>{getCharacterCount('email').current}/{limits.email}</span>
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        aria-invalid={!!errors.email}
                        required
                      />
                      {errors.email && (
                        <p className="text-xs text-destructive flex items-center gap-1 font-mono uppercase font-bold">
                          <AlertCircle className="h-3 w-3" />
                          {errors.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject" className="flex items-center justify-between font-mono uppercase text-xs font-black tracking-widest">
                      <span>Subject *</span>
                      <span className={getCharacterCount('subject').isNearLimit ? 'text-destructive' : 'text-muted-foreground'}>{getCharacterCount('subject').current}/{limits.subject}</span>
                    </Label>
                    <Input
                      id="subject"
                      name="subject"
                      placeholder="What should we look at?"
                      value={formData.subject}
                      onChange={handleInputChange}
                      aria-invalid={!!errors.subject}
                      required
                    />
                    {errors.subject && (
                      <p className="text-xs text-destructive flex items-center gap-1 font-mono uppercase font-bold">
                        <AlertCircle className="h-3 w-3" />
                        {errors.subject}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message" className="flex items-center justify-between font-mono uppercase text-xs font-black tracking-widest">
                      <span>Message *</span>
                      <span className={getCharacterCount('message').isNearLimit ? 'text-destructive' : 'text-muted-foreground'}>{getCharacterCount('message').current}/{limits.message}</span>
                    </Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Tell us what happened, what you expected, and any account or order details that help."
                      rows={6}
                      value={formData.message}
                      onChange={handleInputChange}
                      aria-invalid={!!errors.message}
                      required
                    />
                    {errors.message && (
                      <p className="text-xs text-destructive flex items-center gap-1 font-mono uppercase font-bold">
                        <AlertCircle className="h-3 w-3" />
                        {errors.message}
                      </p>
                    )}
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      className="w-full h-12 text-base"
                      disabled
                    >
                      Send Message [Soon]
                    </Button>
                    <p className="text-xs text-muted-foreground mt-3 text-center font-mono uppercase font-bold tracking-widest">
                      Form delivery is not wired yet. Use the email below for now.
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card className="border-4 shadow-[10px_10px_0px_0px_hsl(var(--primary))] lg:rotate-[1deg]">
              <CardHeader className="border-b-4 border-primary pb-6">
                <CardTitle className="flex items-center gap-3 font-display font-black uppercase tracking-wide text-2xl">
                  <Phone className="h-6 w-6" strokeWidth={3} />
                  Contact Intel
                </CardTitle>
                <CardDescription className="font-mono uppercase tracking-widest font-bold">
                  Fastest path while the form endpoint is pending.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="space-y-6">
                  <div className="p-5 bg-background border-4 border-primary shadow-[6px_6px_0px_0px_hsl(var(--primary))]">
                    <div className="flex items-center gap-3">
                      <Mail className="h-6 w-6 shrink-0" strokeWidth={3} />
                      <div>
                        <h3 className="font-display font-black uppercase tracking-wide text-lg">Direct Email</h3>
                        <p className="text-muted-foreground font-mono font-bold break-all">info@chatlyzerai.com</p>
                        <p className="text-sm text-muted-foreground font-mono uppercase mt-1">Checked manually.</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-primary/5 border-4 border-primary">
                    <h3 className="font-display font-black uppercase tracking-wide text-xl mb-4">
                      Quick Answers_
                    </h3>
                    <ul className="text-sm text-muted-foreground space-y-3 font-mono uppercase leading-relaxed font-bold">
                      <li><span className="text-foreground">// Uploads:</span> paste text or import supported chat exports.</li>
                      <li><span className="text-foreground">// Platforms:</span> WhatsApp, Telegram, Discord, or raw text.</li>
                      <li><span className="text-foreground">// Privacy:</span> analysis stays tied to your account.</li>
                      <li><span className="text-foreground">// Credits:</span> each analysis consumes credits from your dashboard.</li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-5 font-mono uppercase font-bold tracking-widest">
                      For account or billing issues, include the email on your account.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
