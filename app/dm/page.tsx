"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Shield, Award, PlusCircle, Save, Trash2, Pencil, ChevronDown, ChevronRight, FolderPlus, X, Check } from "lucide-react";
import { Badge } from "@/types/supabase";

const ICONS = ['🏆', '💀', '🔥', '⚔️', '🛡️', '💎', '📜', '🧙‍♂️', '🐉', '⚡', '🌟', '🎖️', '🦁', '🌙', '🗡️'];
const DEFAULT_FOLDER = 'General';

type BadgeForm = { name: string; description: string; icon_key: string; folder: string };
const emptyForm = (): BadgeForm => ({ name: '', description: '', icon_key: '🏆', folder: DEFAULT_FOLDER });

export default function DMToolsPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);

    const [badges, setBadges] = useState<Badge[]>([]);
    const [folders, setFolders] = useState<string[]>([DEFAULT_FOLDER]);
    const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

    // Create / Edit Badge Form
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingBadge, setEditingBadge] = useState<Badge | null>(null);
    const [form, setForm] = useState<BadgeForm>(emptyForm());

    // New Folder
    const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    // Edit folder name inline
    const [editingFolder, setEditingFolder] = useState<string | null>(null);
    const [folderDraft, setFolderDraft] = useState('');

    useEffect(() => {
        const checkAccess = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return router.push("/auth/login");

            const { data: profile } = await (supabase.from("profiles").select("role").eq("id", user.id).single() as any);
            if (!profile || (profile.role !== 'dm' && profile.role !== 'admin')) {
                alert("Acceso Restringido: Solo para Dungeon Masters.");
                return router.push("/dashboard");
            }

            const { data: badgesData } = await supabase.from("badges").select("*").eq("created_by", user.id).order("folder").order("created_at", { ascending: false });
            if (badgesData) {
                setBadges(badgesData as Badge[]);
                const uniqueFolders = [...new Set((badgesData as Badge[]).map(b => b.folder || DEFAULT_FOLDER))];
                setFolders(uniqueFolders.length ? uniqueFolders : [DEFAULT_FOLDER]);
            }

            setLoading(false);
        };
        checkAccess();
    }, [router, supabase]);

    // Derive folders from badges (always in sync)
    const allFolders = [...new Set([...folders, ...badges.map(b => b.folder || DEFAULT_FOLDER)])];

    const toggleFolder = (folder: string) => {
        setCollapsedFolders(prev => {
            const next = new Set(prev);
            next.has(folder) ? next.delete(folder) : next.add(folder);
            return next;
        });
    };

    const openCreate = (folder?: string) => {
        setEditingBadge(null);
        setForm({ ...emptyForm(), folder: folder || DEFAULT_FOLDER });
        setIsFormOpen(true);
    };

    const openEdit = (badge: Badge) => {
        setEditingBadge(badge);
        setForm({ name: badge.name, description: badge.description || '', icon_key: badge.icon_key || '🏆', folder: badge.folder || DEFAULT_FOLDER });
        setIsFormOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) return;
        const { data: { user } } = await supabase.auth.getUser();

        if (editingBadge) {
            const { data, error } = await (supabase.from("badges") as any)
                .update({ name: form.name, description: form.description, icon_key: form.icon_key, folder: form.folder || DEFAULT_FOLDER })
                .eq("id", editingBadge.id)
                .select()
                .single();

            if (!error && data) {
                setBadges(prev => prev.map(b => b.id === editingBadge.id ? data : b));
            } else if (error) alert("Error: " + error.message);
        } else {
            const { data, error } = await (supabase.from("badges") as any)
                .insert({ name: form.name, description: form.description, icon_key: form.icon_key, folder: form.folder || DEFAULT_FOLDER, created_by: user?.id })
                .select()
                .single();

            if (!error && data) {
                setBadges(prev => [data, ...prev]);
                // Ensure folder exists in list
                setFolders(prev => prev.includes(data.folder) ? prev : [...prev, data.folder]);
            } else if (error) alert("Error: " + error.message);
        }
        setIsFormOpen(false);
        setEditingBadge(null);
        setForm(emptyForm());
    };

    const handleDelete = async (badge: Badge) => {
        if (!confirm(`¿Eliminar la insignia "${badge.name}"?`)) return;
        const { error } = await (supabase.from("badges") as any).delete().eq("id", badge.id);
        if (!error) {
            setBadges(prev => prev.filter(b => b.id !== badge.id));
        } else alert("Error al eliminar: " + error.message);
    };

    const handleAddFolder = () => {
        const name = newFolderName.trim();
        if (!name || folders.includes(name)) return;
        setFolders(prev => [...prev, name]);
        setNewFolderName('');
        setIsNewFolderOpen(false);
    };

    const handleRenameFolder = async (oldName: string) => {
        const newName = folderDraft.trim();
        if (!newName || newName === oldName) { setEditingFolder(null); return; }
        // Update all badges in this folder
        const toUpdate = badges.filter(b => (b.folder || DEFAULT_FOLDER) === oldName);
        for (const b of toUpdate) {
            await (supabase.from("badges") as any).update({ folder: newName }).eq("id", b.id);
        }
        setBadges(prev => prev.map(b => (b.folder || DEFAULT_FOLDER) === oldName ? { ...b, folder: newName } : b));
        setFolders(prev => prev.map(f => f === oldName ? newName : f));
        setEditingFolder(null);
    };

    const handleDeleteFolder = async (folder: string) => {
        const count = badges.filter(b => (b.folder || DEFAULT_FOLDER) === folder).length;
        if (!confirm(`¿Eliminar carpeta "${folder}"${count > 0 ? ` y sus ${count} insignia(s)` : ''}?`)) return;
        // Delete all badges in the folder
        const ids = badges.filter(b => (b.folder || DEFAULT_FOLDER) === folder).map(b => b.id);
        if (ids.length) {
            await (supabase.from("badges") as any).delete().in("id", ids);
        }
        setBadges(prev => prev.filter(b => (b.folder || DEFAULT_FOLDER) !== folder));
        setFolders(prev => prev.filter(f => f !== folder));
    };

    if (loading) return <div className="h-screen bg-slate-950 flex items-center justify-center text-amber-500 font-bold">Verificando Credenciales...</div>;

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans p-6">
            <header className="max-w-4xl mx-auto mb-10 flex justify-between items-center border-b border-slate-800 pb-6">
                <h1 className="text-3xl font-black text-amber-500 flex items-center gap-3">
                    <Shield size={32} /> Herramientas de DM
                </h1>
                <button onClick={() => router.push("/dashboard")} className="text-slate-500 hover:text-white transition">
                    Volver al Dashboard
                </button>
            </header>

            <main className="max-w-4xl mx-auto space-y-6">

                {/* Top Actions */}
                <div className="flex gap-3 flex-wrap">
                    <button
                        onClick={() => openCreate()}
                        className="flex items-center gap-2 px-5 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl font-bold text-white transition"
                    >
                        <PlusCircle size={18} /> Nueva Insignia
                    </button>
                    <button
                        onClick={() => setIsNewFolderOpen(true)}
                        className="flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-bold text-slate-300 transition"
                    >
                        <FolderPlus size={18} /> Nueva Carpeta
                    </button>
                </div>

                {/* Folders */}
                {allFolders.map(folder => {
                    const folderBadges = badges.filter(b => (b.folder || DEFAULT_FOLDER) === folder);
                    const isCollapsed = collapsedFolders.has(folder);
                    const isEditing = editingFolder === folder;

                    return (
                        <div key={folder} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                            {/* Folder Header */}
                            <div className="flex items-center gap-3 px-5 py-4 bg-slate-900 border-b border-slate-800 group">
                                <button onClick={() => toggleFolder(folder)} className="text-slate-400 hover:text-white transition">
                                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                                </button>

                                {isEditing ? (
                                    <div className="flex items-center gap-2 flex-1">
                                        <input
                                            autoFocus
                                            className="flex-1 bg-slate-800 border border-amber-500 rounded px-2 py-1 text-white font-bold text-sm outline-none"
                                            value={folderDraft}
                                            onChange={e => setFolderDraft(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') handleRenameFolder(folder); if (e.key === 'Escape') setEditingFolder(null); }}
                                        />
                                        <button onClick={() => handleRenameFolder(folder)} className="p-1 text-amber-500 hover:text-amber-300"><Check size={16} /></button>
                                        <button onClick={() => setEditingFolder(null)} className="p-1 text-slate-500 hover:text-white"><X size={16} /></button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={() => toggleFolder(folder)}>
                                        <span className="font-bold text-slate-200 text-base">📁 {folder}</span>
                                        <span className="text-xs text-slate-600 font-mono">({folderBadges.length})</span>
                                    </div>
                                )}

                                {!isEditing && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                        <button
                                            onClick={() => openCreate(folder)}
                                            title="Nueva insignia en esta carpeta"
                                            className="p-1.5 text-slate-500 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition"
                                        ><PlusCircle size={15} /></button>
                                        <button
                                            onClick={() => { setEditingFolder(folder); setFolderDraft(folder); }}
                                            title="Renombrar carpeta"
                                            className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition"
                                        ><Pencil size={15} /></button>
                                        <button
                                            onClick={() => handleDeleteFolder(folder)}
                                            title="Eliminar carpeta"
                                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                                        ><Trash2 size={15} /></button>
                                    </div>
                                )}
                            </div>

                            {/* Badges inside folder */}
                            {!isCollapsed && (
                                <div className="p-4">
                                    {folderBadges.length === 0 ? (
                                        <div className="text-center py-8 text-slate-600 text-sm">
                                            Carpeta vacía.{' '}
                                            <button onClick={() => openCreate(folder)} className="text-amber-500 hover:underline">Añadir insignia</button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {folderBadges.map(badge => (
                                                <div key={badge.id} className="flex items-center gap-4 p-4 bg-slate-950 rounded-xl border border-slate-800 group hover:border-slate-700 transition">
                                                    <div className="text-3xl flex-shrink-0">{badge.icon_key}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-white truncate">{badge.name}</h3>
                                                        <p className="text-slate-500 text-sm line-clamp-2">{badge.description}</p>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                                                        <button
                                                            onClick={() => openEdit(badge)}
                                                            className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition"
                                                        ><Pencil size={14} /></button>
                                                        <button
                                                            onClick={() => handleDelete(badge)}
                                                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                                                        ><Trash2 size={14} /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {allFolders.length === 0 && badges.length === 0 && (
                    <div className="text-center py-16 text-slate-600">
                        <Award className="mx-auto mb-4 opacity-30" size={64} />
                        <p className="text-lg font-bold">No hay insignias todavía.</p>
                        <p className="text-sm mt-1">Crea tu primera insignia o carpeta para empezar.</p>
                    </div>
                )}
            </main>

            {/* Modal: New Folder */}
            {isNewFolderOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setIsNewFolderOpen(false)}>
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold text-white text-lg flex items-center gap-2"><FolderPlus size={20} className="text-amber-500" /> Nueva Carpeta</h3>
                        <input
                            autoFocus
                            className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-amber-500"
                            placeholder="Nombre de la carpeta"
                            value={newFolderName}
                            onChange={e => setNewFolderName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleAddFolder(); if (e.key === 'Escape') setIsNewFolderOpen(false); }}
                        />
                        <div className="flex gap-2">
                            <button onClick={() => setIsNewFolderOpen(false)} className="flex-1 py-2 bg-slate-800 rounded-xl text-slate-400 font-bold">Cancelar</button>
                            <button onClick={handleAddFolder} disabled={!newFolderName.trim()} className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 rounded-xl text-white font-bold disabled:opacity-50">Crear</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Create / Edit Badge */}
            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setIsFormOpen(false)}>
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-white text-lg">{editingBadge ? 'Editar Insignia' : 'Nueva Insignia'}</h3>
                            <button onClick={() => setIsFormOpen(false)} className="text-slate-500 hover:text-white"><X size={20} /></button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Nombre</label>
                                <input
                                    autoFocus
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl focus:border-amber-500 outline-none text-white"
                                    placeholder="Ej: Matadragones"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Descripción</label>
                                <textarea
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl focus:border-amber-500 outline-none h-20 resize-none text-white"
                                    placeholder="Otorgada por..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Carpeta</label>
                                <select
                                    value={form.folder}
                                    onChange={e => setForm({ ...form, folder: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl focus:border-amber-500 outline-none text-white"
                                >
                                    {allFolders.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Icono</label>
                                <div className="flex flex-wrap gap-2">
                                    {ICONS.map(icon => (
                                        <button
                                            key={icon}
                                            onClick={() => setForm({ ...form, icon_key: icon })}
                                            className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center border transition ${form.icon_key === icon ? 'bg-amber-500 border-amber-400' : 'bg-slate-950 border-slate-700 hover:bg-slate-800'}`}
                                        >
                                            {icon}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={!form.name.trim()}
                            className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition"
                        >
                            <Save size={18} /> {editingBadge ? 'Guardar Cambios' : 'Crear Insignia'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
