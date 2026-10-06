import React from "react";
import Icon from "./Icon";
import "./ProfileInformation.css";

function Field({ icon, label, value, onChange, disabled = false, placeholder = "" }) {
  return (
    <div className="field-group">
      <label>
        <Icon name={icon} size={20} />
        <span>{label}</span>
      </label>

      <input
        value={value || ""}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={disabled ? "cursor-not-allowed opacity-75" : ""}
      />
    </div>
  );
}

export default function ProfileInformation({
  formData = {},
  setFormData = () => {},
  user = {},
  onSave = () => {},
  saving = false,
  saved = false,
}) {
  const avatarLetter = (formData.name || user?.name || "U")[0]?.toUpperCase() || "U";
  const bioLength = formData.bio ? formData.bio.length : 0;

  return (
    <section className="profile-card">
      <div className="card-header">
        <div>
          <h2>Profile Information</h2>
          <p>Update your personal information and how others see you.</p>
        </div>

        <button
          className="save-button"
          type="button"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? (
            <span>Saving...</span>
          ) : saved ? (
            <>
              <span>✓</span>
              <span>Saved</span>
            </>
          ) : (
            <span>Save Changes</span>
          )}
        </button>
      </div>

      <div className="divider" />

      <div className="photo-row">
        <div className="profile-photo-wrap">
          <div className="profile-photo">{avatarLetter}</div>

          <button
            className="camera-button"
            type="button"
            aria-label="Change photo"
          >
            <Icon name="camera" size={15} />
          </button>
        </div>

        <div className="photo-copy">
          <h3>Profile Photo</h3>

          <p>
            Default avatar is generated from your account name. JPG, PNG or GIF (max 5MB).
          </p>

          <div className="photo-actions">
            <button className="upload-button" type="button">
              <Icon name="upload" size={16} />
              Upload Photo
            </button>

            <button
              className="remove-button"
              type="button"
              onClick={() => {
                setFormData((prev) => ({ ...prev, name: prev.name }));
              }}
            >
              <Icon name="trash" size={15} />
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="divider" />

      <div className="form-grid">
        <Field
          icon="user"
          label="Full Name"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          placeholder="e.g. Alex Johnson"
        />

        <Field
          icon="mail"
          label="Email Address"
          value={user?.email || formData.email}
          disabled={true}
          placeholder="user@example.com"
        />

        <div className="field-group">
          <label>
            <Icon name="file" size={20} />
            <span>Bio</span>
          </label>

          <textarea
            value={formData.bio || ""}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, bio: e.target.value }))
            }
            placeholder="Tell us about yourself and your tech stack..."
            maxLength={250}
          />

          <span className="character-count">
            {bioLength}/250
          </span>
        </div>

        <Field
          icon="location"
          label="Location"
          value={formData.location}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, location: e.target.value }))
          }
          placeholder="e.g. San Francisco, CA"
        />

        <div className="field-group website-field">
          <label>
            <Icon name="link" size={20} />
            <span>Website</span>
          </label>

          <input
            value={formData.website || ""}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, website: e.target.value }))
            }
            placeholder="https://yourportfolio.com"
          />
        </div>
      </div>
    </section>
  );
}