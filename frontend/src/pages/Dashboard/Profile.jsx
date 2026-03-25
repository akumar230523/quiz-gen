import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/common/Layout';
import { authAPI } from '@/services/api';
import { User, Mail, Shield, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import Spinner from '@/components/common/Spinner';

export default function Profile() {
    const { user, refreshUser } = useAuth();
    const [saving, setSaving] = useState(false);
    const [displayName, setDisplayName] = useState(user?.profile?.display_name || user?.username || '');

    useEffect(() => {
        setDisplayName(user?.profile?.display_name || user?.username || '');
    }, [user]);

    const save = async () => {
        setSaving(true);
        try {
            await authAPI.updateProfile({ profile: { display_name: displayName } });
            await refreshUser();
            toast.success('Profile updated');
        } catch { toast.error('Update failed'); }
        finally { setSaving(false); }
    };

    return (
        <Layout>
            <div className="page max-w-2xl">
                <h1 className="text-3xl font-display font-bold mb-8">Profile</h1>

                <div className="glass p-8 space-y-6">
                    {/* Avatar */}
                    <div className="flex items-center gap-5">
                        <div className="w-20 h-20 rounded-2xl bg-violet flex items-center justify-center text-3xl font-display font-black text-white">
                            {user?.username?.[0]?.toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-xl font-display font-bold">{user?.username}</h2>
                            <span className="badge-violet">{user?.role}</span>
                        </div>
                    </div>

                    <div className="divider" />

                    <div>
                        <label className="label">Display Name</label>
                        <div className="relative">
                            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                            <input className="input pl-10" value={displayName}
                                onChange={e => setDisplayName(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="label">Username</label>
                        <div className="relative">
                            <Shield size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                            <input className="input pl-10 opacity-50 cursor-not-allowed" value={user?.username || ''} />
                        </div>
                        <p className="text-xs text-white/30 mt-1">Username cannot be changed.</p>
                    </div>
                    <div>
                        <label className="label">Email</label>
                        <div className="relative">
                            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                            <input
                                className="input pl-10 opacity-50 cursor-not-allowed"
                                value={user?.email || '— Not provided'}
                                readOnly
                                disabled
                            />
                        </div>
                    </div>

                    <button onClick={save} disabled={saving} className="btn-primary">
                        {saving ? <Spinner size="sm" /> : <><Save size={15} /> Save Changes</>}
                    </button>
                </div>
            </div>
        </Layout>
    );
}