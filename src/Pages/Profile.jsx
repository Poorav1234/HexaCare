import React, { useState, useEffect } from "react";
import { User, Mail, Phone, Calendar, Droplet, Wallet, ShieldCheck, Cpu, Settings, Edit3, Save, X, Loader2 } from "lucide-react";
import NavBar from "../Components/NavBar";
import { getUserProfile, updateUserProfileFields } from "../firebase/dbService";

const Profile = ({ user }) => {
    const [profileData, setProfileData] = useState({});
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            if (user && user.uid) {
                try {
                    const data = await getUserProfile(user.uid);
                    if (data) {
                        setProfileData(data);
                        setEditForm(data);
                    }
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchProfile();
    }, [user]);

    const handleEditChange = (e) => {
        setEditForm({ ...editForm, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateUserProfileFields(user.uid, editForm);
            setProfileData(editForm);
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to update profile", error);
            alert("Failed to update profile. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col">
                <NavBar user={user} profileData={profileData} />
                <main className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-neonPurple" />
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <NavBar user={user} profileData={profileData} />

            <main className="flex-1 p-6 md:p-12 relative z-10 w-full max-w-5xl mx-auto space-y-6">

                {/* Header Banner */}
                <div className="glass-card rounded-2xl p-8 border border-slate-700/50 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-neonPurple/10 to-transparent pointer-events-none"></div>

                    <div className="relative z-10 flex items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-neonPurple flex items-center justify-center p-1 relative">
                            <div className="absolute -inset-2 rounded-full border border-neonPurple/30 animate-[spin_10s_linear_infinite]"></div>
                            {user.photoURL ? (
                                <img src={user.photoURL} alt="Profile" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <User className="w-10 h-10 text-neonPurple" />
                            )}
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-widest uppercase">{profileData.fullName || "Anonymous Node"}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <ShieldCheck className="w-4 h-4 text-neonGreen" />
                                <span className="text-sm font-medium text-neonGreen tracking-widest uppercase">Verified Identity</span>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 flex flex-col items-end gap-3 w-full md:w-auto">
                        <div className="hidden md:block text-right">
                            <p className="text-xs text-slate-500 uppercase tracking-widest font-mono mb-1">Decentralized Anchor ID</p>
                            <p className="text-xs font-mono bg-slate-900/80 px-3 py-1.5 rounded-md border border-slate-800 text-slate-400">
                                {user.uid}
                            </p>
                        </div>
                        {!isEditing ? (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded-lg text-sm transition-colors"
                            >
                                <Edit3 className="w-4 h-4" /> Edit Parameters
                            </button>
                        ) : (
                            <div className="flex gap-2 w-full md:w-auto">
                                <button
                                    onClick={() => { setIsEditing(false); setEditForm(profileData); }}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-600 hover:border-rose-500/50 rounded-lg text-sm transition-colors"
                                >
                                    <X className="w-4 h-4" /> Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-neonGreen/10 hover:bg-neonGreen/20 text-neonGreen border border-neonGreen/50 rounded-lg text-sm transition-colors disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Identity Core */}
                    <div className="md:col-span-2 glass-card rounded-2xl p-8 border border-slate-700/50 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-neonCyan/5 blur-3xl rounded-full pointer-events-none"></div>

                        <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-3 relative z-10">
                            <Cpu className="w-5 h-5 text-neonCyan" /> Core Metrics
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 relative z-10">
                            <div className="space-y-1">
                                <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Protocol Email</span>
                                <div className="flex items-center gap-3 text-slate-200">
                                    <Mail className="w-4 h-4 text-slate-400" /> {profileData.email}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Communication (Phone)</span>
                                {isEditing ? (
                                    <input
                                        name="phoneNumber"
                                        value={editForm.phoneNumber || ""}
                                        onChange={handleEditChange}
                                        className="w-full bg-slate-900 border border-slate-700 text-white rounded px-3 py-1.5 text-sm focus:border-neonCyan outline-none"
                                        placeholder="Enter phone"
                                    />
                                ) : (
                                    <div className="flex items-center gap-3 text-slate-200">
                                        <Phone className="w-4 h-4 text-slate-400" /> {profileData.phoneNumber || "Not Specified"}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1">
                                <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Date of Synthesis (DOB)</span>
                                {isEditing ? (
                                    <input
                                        type="date"
                                        name="dateOfBirth"
                                        value={editForm.dateOfBirth || ""}
                                        onChange={handleEditChange}
                                        className="w-full bg-slate-900 border border-slate-700 text-white rounded px-3 py-1.5 text-sm focus:border-neonCyan outline-none"
                                    />
                                ) : (
                                    <div className="flex items-center gap-3 text-slate-200">
                                        <Calendar className="w-4 h-4 text-slate-400" /> {profileData.dateOfBirth || "Not Specified"}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1">
                                <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Gender Expression</span>
                                {isEditing ? (
                                    <select
                                        name="gender"
                                        value={editForm.gender || ""}
                                        onChange={handleEditChange}
                                        className="w-full bg-slate-900 border border-slate-700 text-white rounded px-3 py-1.5 text-sm focus:border-neonCyan outline-none"
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Non-binary">Non-binary</option>
                                        <option value="Other">Other</option>
                                        <option value="Prefer not to say">Prefer not to say</option>
                                    </select>
                                ) : (
                                    <div className="flex items-center gap-3 text-slate-200">
                                        <User className="w-4 h-4 text-slate-400" /> {profileData.gender || "Not Specified"}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1">
                                <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Blood Classification</span>
                                {isEditing ? (
                                    <select
                                        name="bloodGroup"
                                        value={editForm.bloodGroup || ""}
                                        onChange={handleEditChange}
                                        className="w-full bg-slate-900 border border-slate-700 text-white rounded px-3 py-1.5 text-sm focus:border-neonCyan outline-none"
                                    >
                                        <option value="">Unknown</option>
                                        <option value="A+">A+</option>
                                        <option value="A-">A-</option>
                                        <option value="B+">B+</option>
                                        <option value="B-">B-</option>
                                        <option value="AB+">AB+</option>
                                        <option value="AB-">AB-</option>
                                        <option value="O+">O+</option>
                                        <option value="O-">O-</option>
                                    </select>
                                ) : (
                                    <div className="flex items-center gap-3 text-slate-200">
                                        <Droplet className="w-4 h-4 text-rose-500" /> {profileData.bloodGroup || "Not Specified"}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1">
                                <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Status</span>
                                <div className="flex items-center gap-3 text-slate-200">
                                    <div className="w-2 h-2 rounded-full bg-neonGreen animate-pulse"></div> Active
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Simulated Blockchain Wallet Config */}
                    <div className="md:col-span-1 glass-card rounded-2xl p-8 border border-slate-700/50 bg-gradient-to-b from-slate-900/50 to-slate-900 flex flex-col justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-3">
                                <Wallet className="w-5 h-5 text-neonGreen" /> Web3 State
                            </h3>

                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">EVM Identity Hash</span>
                                    {isEditing ? (
                                        <input
                                            name="walletAddress"
                                            value={editForm.walletAddress || ""}
                                            onChange={handleEditChange}
                                            className="w-full bg-slate-900 border border-slate-700 text-white rounded px-3 py-1.5 text-sm focus:border-neonGreen outline-none font-mono text-[10px]"
                                            placeholder="0x..."
                                        />
                                    ) : (
                                        <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 break-all text-xs font-mono text-neonCyan/80 select-all">
                                            {profileData.walletAddress || "0x000...000"}
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 bg-slate-950/80 rounded-xl border border-neonGreen/20">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold">Network</p>
                                    <p className="text-sm text-neonGreen font-mono">HexaCare Mainnet</p>
                                </div>

                                <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold">Smart Contract Sync</p>
                                    <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
                                        <div className="bg-neonGreen h-1.5 rounded-full" style={{ width: '100%' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 text-center text-[10px] text-slate-600 uppercase tracking-widest">
                            Records are securely hashed and stored in decentralised node clusters.
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
};

export default Profile;
