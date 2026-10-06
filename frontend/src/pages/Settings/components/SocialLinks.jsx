import React from "react";
import Icon from "./Icon";
import "./SocialLinks.css";

function SocialField({ icon, label, value, onChange, placeholder = "" }) {
  return (
    <div className="field-group social-field">
      <label>
        <Icon name={icon} size={20} />
        <span>{label}</span>
      </label>

      <input
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  );
}

export default function SocialLinks({
  socialLinks = {},
  setSocialLinks = () => {},
}) {
  const handleChange = (network, val) => {
    setSocialLinks((prev) => ({
      ...prev,
      [network]: val,
    }));
  };

  return (
    <section className="social-section">
      <div className="section-title">
        <h2>Social Links</h2>

        <p>
          Add your social profiles and online presence to share with others.
        </p>
      </div>

      <div className="social-grid">
        <SocialField
          icon="github"
          label="GitHub"
          value={socialLinks.github}
          onChange={(e) => handleChange("github", e.target.value)}
          placeholder="https://github.com/yourhandle"
        />

        <SocialField
          icon="linkedin"
          label="LinkedIn"
          value={socialLinks.linkedin}
          onChange={(e) => handleChange("linkedin", e.target.value)}
          placeholder="https://linkedin.com/in/yourhandle"
        />

        <SocialField
          icon="x"
          label="Twitter / X"
          value={socialLinks.twitter}
          onChange={(e) => handleChange("twitter", e.target.value)}
          placeholder="https://x.com/yourhandle"
        />

        <SocialField
          icon="youtube"
          label="YouTube"
          value={socialLinks.youtube}
          onChange={(e) => handleChange("youtube", e.target.value)}
          placeholder="https://youtube.com/@yourchannel"
        />
      </div>
    </section>
  );
}