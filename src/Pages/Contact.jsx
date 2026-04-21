import React, { useState } from "react";
import NavBar from "../Components/NavBar";
import { Mail, MessageSquare, Phone, MapPin, Send, CheckCircle } from "lucide-react";

const InfoCard = ({ icon: Icon, title, value, color }) => (
    <div className="glass-card p-5 rounded-2xl border border-slate-700/50 flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0`}>
            <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{title}</p>
            <p className="text-sm text-slate-200 font-medium">{value}</p>
        </div>
    </div>
);

const Contact = ({ user, profileData }) => {
    const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
    const [sent, setSent] = useState(false);
    const [errors, setErrors] = useState({});

    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = "Name is required";
        if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = "Valid email required";
        if (!form.subject.trim()) e.subject = "Subject is required";
        if (!form.message.trim() || form.message.length < 10) e.message = "Message must be at least 10 characters";
        return e;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }
        setErrors({});
        // Simulate submission (wire to real API/email service as needed)
        setSent(true);
    };

    const inputClass = (field) =>
        `w-full bg-slate-900/60 border ${errors[field] ? "border-red-500/60" : "border-slate-700/60"} text-slate-200 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-neonCyan/60 placeholder:text-slate-600 transition-colors`;

    return (
        <div className="min-h-screen flex flex-col">
            <NavBar user={user} profileData={profileData} />

            <main className="flex-1 p-6 md:p-12 relative z-10">
                <div className="max-w-5xl mx-auto space-y-10">

                    {/* Header */}
                    <section className="glass-card p-8 rounded-2xl relative overflow-hidden border-t-4 border-t-neonPurple">
                        <div className="absolute -top-16 -right-16 w-48 h-48 bg-neonPurple/5 blur-3xl rounded-full pointer-events-none" />
                        <div className="relative z-10">
                            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neonPurple bg-neonPurple/10 border border-neonPurple/20 px-3 py-1.5 rounded-full mb-4">
                                <MessageSquare className="w-3.5 h-3.5" /> Contact Us
                            </span>
                            <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Get in Touch</h1>
                            <p className="text-slate-400 max-w-lg">
                                Have a question, feedback, or need support? Fill out the form and our team will get back to you as soon as possible.
                            </p>
                        </div>
                    </section>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Contact Info */}
                        <div className="space-y-4">
                            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Contact Information</h2>
                            <InfoCard icon={Mail} color="text-neonCyan" title="Email Us" value="hexacarembs@gmail.com" />
                            <InfoCard icon={Phone} color="text-emerald-400" title="Call Us" value="+91 78744 26640" />
                            <InfoCard icon={MessageSquare} color="text-neonPurple" title="Response Time" value="Within 24–48 hours" />

                            {/* FAQ hint */}
                            <div className="glass-card p-5 rounded-2xl border border-slate-700/50 mt-2">
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Quick Tips</p>
                                <ul className="text-xs text-slate-400 space-y-2">
                                    <li className="flex items-start gap-2"><span className="text-neonCyan mt-0.5">→</span> For MetaMask errors, ensure you are connected to the Sepolia network</li>
                                    <li className="flex items-start gap-2"><span className="text-neonCyan mt-0.5">→</span> AI analysis requires a text-based PDF, not a scanned image</li>
                                </ul>
                            </div>
                        </div>

                        {/* Contact Form */}
                        <div className="lg:col-span-2">
                            {sent ? (
                                <div className="glass-card p-10 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 text-center h-full flex flex-col items-center justify-center gap-4">
                                    <CheckCircle className="w-14 h-14 text-emerald-400" />
                                    <h3 className="text-xl font-bold text-white">Message Sent!</h3>
                                    <p className="text-slate-400 text-sm max-w-sm">
                                        Thank you for reaching out, <strong>{form.name}</strong>. We'll get back to you at <strong>{form.email}</strong> within 24–48 hours.
                                    </p>
                                    <button
                                        onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "", message: "" }); }}
                                        className="mt-2 px-5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-300 hover:border-slate-600 transition-all"
                                    >
                                        Send Another Message
                                    </button>
                                </div>
                            ) : (
                                <div className="glass-card p-7 rounded-2xl border border-slate-700/50">
                                    <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-6">Send a Message</h2>
                                    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            <div>
                                                <label className="text-xs text-slate-400 uppercase tracking-widest mb-1.5 block">Your Name</label>
                                                <input
                                                    type="text"
                                                    placeholder="John Doe"
                                                    value={form.name}
                                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                                    className={inputClass("name")}
                                                />
                                                {errors.name && <p className="text-red-400 text-[11px] mt-1">{errors.name}</p>}
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400 uppercase tracking-widest mb-1.5 block">Email Address</label>
                                                <input
                                                    type="email"
                                                    placeholder="you@example.com"
                                                    value={form.email}
                                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                                    className={inputClass("email")}
                                                />
                                                {errors.email && <p className="text-red-400 text-[11px] mt-1">{errors.email}</p>}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400 uppercase tracking-widest mb-1.5 block">Subject</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Report upload issue"
                                                value={form.subject}
                                                onChange={e => setForm({ ...form, subject: e.target.value })}
                                                className={inputClass("subject")}
                                            />
                                            {errors.subject && <p className="text-red-400 text-[11px] mt-1">{errors.subject}</p>}
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400 uppercase tracking-widest mb-1.5 block">Message</label>
                                            <textarea
                                                rows={6}
                                                placeholder="Tell us how we can help..."
                                                value={form.message}
                                                onChange={e => setForm({ ...form, message: e.target.value })}
                                                className={`${inputClass("message")} resize-none`}
                                            />
                                            {errors.message && <p className="text-red-400 text-[11px] mt-1">{errors.message}</p>}
                                        </div>
                                        <button
                                            type="submit"
                                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-neonPurple/10 border border-neonPurple/30 text-neonPurple font-semibold text-sm hover:bg-neonPurple/20 transition-all"
                                        >
                                            <Send className="w-4 h-4" /> Send Message
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Contact;
