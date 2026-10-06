import React, { useEffect, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import Topbar from "./components/Topbar";
import SettingsMenu from "./components/SettingsMenu";
import ProfileInformation from "./components/ProfileInformation";
import SocialLinks from "./components/SocialLinks";
import AccountTab from "./components/AccountTab";
import AppearanceTab from "./components/AppearanceTab";
import GitHubTab from "./components/GitHubTab";
import GeneralTab from "./components/GeneralTab";
import { getCurrentUser, updateCurrentUser } from "../../api/auth";
import "./Settings.css";

function getToken() {
  return (
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token")
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const outletCtx = useOutletContext() || {};
  const { darkMode = true, setDarkMode = () => {}, notify = () => {} } = outletCtx;

  const [activeTab, setActiveTab] = useState("Profile");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    bio: "",
    location: "",
    website: "",
  });

  const [socialLinks, setSocialLinks] = useState({
    github: "",
    linkedin: "",
    twitter: "",
    youtube: "",
  });

  const token = getToken();

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    const loadUser = async () => {
      try {
        const data = await getCurrentUser(token);
        setUser(data);
        setFormData({
          name: data.name || "",
          email: data.email || "",
          bio: data.bio || "",
          location: data.location || "",
          website: data.website || "",
        });
        setSocialLinks(data.social_links || {});
      } catch (err) {
        console.error("Failed to load user settings:", err);
        notify("Failed to load user profile");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token, navigate]);

  const handleSaveProfile = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const updated = await updateCurrentUser(
        {
          name: formData.name,
          bio: formData.bio,
          location: formData.location,
          website: formData.website,
          social_links: socialLinks,
        },
        token
      );
      setUser(updated);
      setSaved(true);
      notify("Profile updated successfully!");
      setTimeout(() => setSaved(false), 2400);
    } catch (err) {
      console.error("Failed to update profile:", err);
      const msg = err?.response?.data?.detail || "Failed to update profile.";
      notify(msg);
    } finally {
      setSaving(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "Profile":
        return (
          <section className="profile-card-wrapper">
            <ProfileInformation
              user={user}
              formData={formData}
              setFormData={setFormData}
              onSave={handleSaveProfile}
              saving={saving}
              saved={saved}
            />
            <div className="profile-divider" />
            <SocialLinks
              socialLinks={socialLinks}
              setSocialLinks={setSocialLinks}
            />
          </section>
        );

      case "Account":
        return (
          <AccountTab
            user={user}
            token={token}
            onNotify={notify}
          />
        );

      case "Appearance":
        return (
          <AppearanceTab
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            onNotify={notify}
          />
        );

      case "GitHub":
        return (
          <GitHubTab
            user={user}
            onNotify={notify}
          />
        );

      default:
        return (
          <GeneralTab
            activeTab={activeTab}
            onNotify={notify}
          />
        );
    }
  };

  const displayName = formData.name || user?.name || "User";
  const avatarLetter = (displayName[0] || "U").toUpperCase();

  return (
    <div className="settings-page">
      <Topbar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        userName={displayName}
        avatarLetter={avatarLetter}
        onNotify={notify}
      />

      <main className="settings-content">
        <section className="page-heading">
          <h1>Settings</h1>
          <p>Manage your account, preferences and integrations.</p>
        </section>

        <div className="settings-layout">
          <SettingsMenu
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />

          <div className="settings-main-panel min-w-0">
            {loading ? (
              <div className="settings-tab-card text-center py-12 text-[#8c969f]">
                Loading profile settings...
              </div>
            ) : (
              renderTabContent()
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
