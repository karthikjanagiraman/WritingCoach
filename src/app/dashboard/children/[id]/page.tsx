"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";

const AVATAR_OPTIONS = [
  "\uD83E\uDD89", // owl
  "\uD83E\uDD8A", // fox
  "\uD83D\uDC3A", // wolf
  "\uD83D\uDC3B", // bear
  "\uD83D\uDC31", // cat
  "\uD83D\uDC36", // dog
  "\uD83D\uDC30", // rabbit
  "\uD83E\uDD8B", // butterfly
  "\uD83C\uDF1F", // star
];

function computeTierLabel(age: number): string {
  if (age <= 9) return "Tier 1: Foundational";
  if (age <= 12) return "Tier 2: Developing";
  return "Tier 3: Advanced";
}

export default function EditChildPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [name, setName] = useState("");
  const [age, setAge] = useState(8);
  const [gradeLevel, setGradeLevel] = useState("");
  const [interests, setInterests] = useState("");
  const [avatarEmoji, setAvatarEmoji] = useState(AVATAR_OPTIONS[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/children/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load child profile");
        return res.json();
      })
      .then((data) => {
        const child = data.child;
        setName(child.name);
        setAge(child.age);
        setGradeLevel(child.gradeLevel || "");
        setInterests(child.interests || "");
        setAvatarEmoji(child.avatarEmoji);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (age < 7 || age > 15) {
      setError("Age must be between 7 and 15");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/children/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          age,
          gradeLevel: gradeLevel.trim() || null,
          interests: interests.trim() || null,
          avatarEmoji,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update profile");
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);

    try {
      const res = await fetch(`/api/children/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete profile");
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF9F0] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl animate-bounce-slow">&#128218;</div>
          <p className="mt-4 text-[#2D3436]/60 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF9F0]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-[#FF6B6B]/10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-sm font-semibold text-[#2D3436]/60 hover:text-[#2D3436] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="animate-fade-in">
          <h2 className="text-2xl font-extrabold text-[#2D3436] mb-1">
            Edit Profile
          </h2>
          <p className="text-[#2D3436]/60 mb-8">
            Update {name ? `${name}'s` : "your child's"} profile information.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm font-medium mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6 animate-fade-in stagger-1">
          {/* Name */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#FF6B6B]/10">
            <label className="block text-sm font-bold text-[#2D3436] mb-2">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter child's name"
              className="w-full px-4 py-3 border border-[#2D3436]/10 rounded-xl text-[#2D3436] placeholder-[#2D3436]/30 focus:outline-none focus:border-[#FF6B6B]/50 focus:ring-2 focus:ring-[#FF6B6B]/20 transition-colors"
              required
            />
          </div>

          {/* Age + Tier Preview */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#FF6B6B]/10">
            <label className="block text-sm font-bold text-[#2D3436] mb-2">
              Age
            </label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              min={7}
              max={15}
              className="w-full px-4 py-3 border border-[#2D3436]/10 rounded-xl text-[#2D3436] focus:outline-none focus:border-[#FF6B6B]/50 focus:ring-2 focus:ring-[#FF6B6B]/20 transition-colors"
              required
            />
            {age >= 7 && age <= 15 && (
              <p className="mt-2 text-sm font-semibold text-[#4ECDC4]">
                {computeTierLabel(age)}
              </p>
            )}
          </div>

          {/* Avatar Picker */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#FF6B6B]/10">
            <label className="block text-sm font-bold text-[#2D3436] mb-3">
              Avatar
            </label>
            <div className="grid grid-cols-5 sm:grid-cols-9 gap-2">
              {AVATAR_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatarEmoji(emoji)}
                  className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all duration-150 ${
                    avatarEmoji === emoji
                      ? "bg-[#FF6B6B]/10 ring-2 ring-[#FF6B6B] scale-110"
                      : "bg-[#2D3436]/5 hover:bg-[#2D3436]/10"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Grade Level (optional) */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#FF6B6B]/10">
            <label className="block text-sm font-bold text-[#2D3436] mb-2">
              Grade Level
              <span className="font-normal text-[#2D3436]/40 ml-1">(optional)</span>
            </label>
            <input
              type="text"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              placeholder="e.g., 3rd grade"
              className="w-full px-4 py-3 border border-[#2D3436]/10 rounded-xl text-[#2D3436] placeholder-[#2D3436]/30 focus:outline-none focus:border-[#FF6B6B]/50 focus:ring-2 focus:ring-[#FF6B6B]/20 transition-colors"
            />
          </div>

          {/* Interests (optional) */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#FF6B6B]/10">
            <label className="block text-sm font-bold text-[#2D3436] mb-2">
              Writing Interests
              <span className="font-normal text-[#2D3436]/40 ml-1">(optional)</span>
            </label>
            <input
              type="text"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="e.g., animals, space, adventure stories"
              className="w-full px-4 py-3 border border-[#2D3436]/10 rounded-xl text-[#2D3436] placeholder-[#2D3436]/30 focus:outline-none focus:border-[#FF6B6B]/50 focus:ring-2 focus:ring-[#FF6B6B]/20 transition-colors"
            />
          </div>

          {/* Save / Cancel */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="flex-1 px-6 py-3 bg-white border border-[#2D3436]/10 text-[#2D3436]/60 rounded-xl text-sm font-bold hover:bg-[#2D3436]/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-[#FF6B6B] text-white rounded-xl text-sm font-bold hover:bg-[#FF6B6B]/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>

          {/* Delete Section */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-red-200/50 mt-8">
            <h3 className="text-sm font-bold text-red-600 mb-2">
              Danger Zone
            </h3>
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-sm font-semibold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
              >
                Delete Profile
              </button>
            ) : (
              <div>
                <p className="text-sm text-[#2D3436]/60 mb-3">
                  Are you sure? This will permanently delete {name ? `${name}'s` : "this child's"} profile. This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 text-sm font-semibold text-[#2D3436]/60 border border-[#2D3436]/10 rounded-xl hover:bg-[#2D3436]/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {deleting ? "Deleting..." : "Yes, Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
