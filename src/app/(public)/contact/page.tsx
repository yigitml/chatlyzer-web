"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    <div className="min-h-screen text-white bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      {/* Navigation */}
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/favicon.ico" alt="Chatlyzer" width={32} height={32} className="w-8 h-8" />
          <span className="font-bold text-xl bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Chatlyzer
          </span>
        </Link>

        <Button
          variant="outline"
          onClick={() => router.push("/")}
          className="bg-white/10 hover:bg-white/20 border-purple-400/30 text-white backdrop-blur-sm"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back Home
        </Button>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-purple-300 bg-white/10 rounded-full px-4 py-2 mb-6 backdrop-blur-sm">
              <Sparkles className="w-4 h-4" />
              <span>Hit us up bestie ✨</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Got questions?
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
                We got answers
              </span> 💬
            </h1>
            
            <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
              Drop us a line and we'll get back to you faster than your crush leaves you on read 💀
            </p>
          </div>
          
          <div className="space-y-6">
            {/* Contact Form */}
            <Card className="bg-white/5 border-purple-400/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <MessageSquare className="h-5 w-5 text-purple-400" />
                  Spill the tea ☕
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Whether you're confused, stuck, or just want to say hi - we're here for it 💯
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="flex items-center justify-between text-white">
                        <span>Your name bestie *</span>
                        <span className={`text-xs ${getCharacterCount('name').isNearLimit ? 'text-orange-400' : 'text-gray-400'}`}>
                          {getCharacterCount('name').current}/{limits.name}
                        </span>
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="What should we call you?"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={`bg-white/10 border-purple-400/30 text-white placeholder:text-gray-400 ${errors.name ? "border-red-500" : ""}`}
                        required
                      />
                      {errors.name && (
                        <p className="text-xs text-red-400 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.name}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center justify-between text-white">
                        <span>Email *</span>
                        <span className={`text-xs ${getCharacterCount('email').isNearLimit ? 'text-orange-400' : 'text-gray-400'}`}>
                          {getCharacterCount('email').current}/{limits.email}
                        </span>
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={`bg-white/10 border-purple-400/30 text-white placeholder:text-gray-400 ${errors.email ? "border-red-500" : ""}`}
                        required
                      />
                      {errors.email && (
                        <p className="text-xs text-red-400 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject" className="flex items-center justify-between text-white">
                      <span>What's this about? *</span>
                      <span className={`text-xs ${getCharacterCount('subject').isNearLimit ? 'text-orange-400' : 'text-gray-400'}`}>
                        {getCharacterCount('subject').current}/{limits.subject}
                      </span>
                    </Label>
                    <Input
                      id="subject"
                      name="subject"
                      placeholder="Give us the topic bestie"
                      value={formData.subject}
                      onChange={handleInputChange}
                      className={`bg-white/10 border-purple-400/30 text-white placeholder:text-gray-400 ${errors.subject ? "border-red-500" : ""}`}
                      required
                    />
                    {errors.subject && (
                      <p className="text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.subject}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message" className="flex items-center justify-between text-white">
                      <span>Your message *</span>
                      <span className={`text-xs ${getCharacterCount('message').isNearLimit ? 'text-orange-400' : 'text-gray-400'}`}>
                        {getCharacterCount('message').current}/{limits.message}
                      </span>
                    </Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Spill everything... we're listening 👂"
                      rows={6}
                      value={formData.message}
                      onChange={handleInputChange}
                      className={`bg-white/10 border-purple-400/30 text-white placeholder:text-gray-400 ${errors.message ? "border-red-500" : ""}`}
                      required
                    />
                    {errors.message && (
                      <p className="text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.message}
                      </p>
                    )}
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium transition-all duration-200 hover:scale-105 opacity-50 cursor-not-allowed"
                      disabled
                    >
                      Send that energy ✨
                    </Button>
                    <p className="text-xs text-gray-400 mt-2 text-center">
                      This form is currently disabled - implementation pending (but we're working on it fr fr) 💀
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card className="bg-white/5 border-purple-400/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Phone className="h-5 w-5 text-purple-400" />
                  Other ways to vibe with us 📱
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Multiple ways to reach us because we're accommodating like that ✨
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-400/20">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-blue-400" />
                      <div>
                        <h3 className="font-semibold text-white">Direct line to us</h3>
                        <p className="text-purple-300">info@chatlyzerai.com</p>
                        <p className="text-sm text-gray-400">We actually check this one 💯</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-400/20">
                    <h3 className="font-semibold text-white mb-3">
                      Quick answers to common Qs 🤔
                    </h3>
                    <ul className="text-sm text-gray-300 space-y-2">
                      <li>• How do I upload and analyze my chats? → Super easy, just drag & drop or paste</li>
                      <li>• What chat platforms work? → WhatsApp, Telegram, Discord, or any copy-paste</li>
                      <li>• Is my data safe? → We analyze, you get insights, nobody else sees your business</li>
                      <li>• What are the different vibes? → Red flags, green flags, simp meter, ghost risk & more</li>
                      <li>• How do credits work? → Each analysis costs credits, get more in your dashboard</li>
                    </ul>
                    <p className="text-sm text-purple-300 mt-3">
                      Still confused? Hit us up - no judgment zone here 🫶
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
