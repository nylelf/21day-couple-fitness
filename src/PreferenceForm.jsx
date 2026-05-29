import {
  CYCLE_LENGTHS,
  EQUIPMENT_OPTIONS,
  FITNESS_LEVELS,
  GOALS,
  SESSION_DURATIONS,
} from "./preferenceProfile";

function Button({ className = "", children, ...props }) {
  return (
    <button type="button" className={`app-btn ${className}`} {...props}>
      {children}
    </button>
  );
}

function OptionGroup({ label, options, value, onChange }) {
  return (
    <div className="pref-field">
      <div className="pref-field-label">{label}</div>
      <div className="role-toggle-grid pref-option-grid">
        {options.map((option) => (
          <Button
            key={String(option.value)}
            className={`role-btn ${value === option.value ? "is-active" : ""}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default function PreferenceForm({ role, value, onChange }) {
  function patch(fields) {
    onChange({ ...value, ...fields });
  }

  return (
    <div className="pref-form section-stack">
      <OptionGroup
        label="训练年限"
        options={FITNESS_LEVELS}
        value={value.fitnessLevel}
        onChange={(fitnessLevel) => patch({ fitnessLevel })}
      />

      <OptionGroup
        label="训练目标"
        options={GOALS}
        value={value.goal}
        onChange={(goal) => patch({ goal })}
      />

      <OptionGroup
        label="可用器材"
        options={EQUIPMENT_OPTIONS}
        value={value.equipment}
        onChange={(equipment) => patch({ equipment })}
      />

      <OptionGroup
        label="每次训练时间"
        options={SESSION_DURATIONS}
        value={value.sessionDuration}
        onChange={(sessionDuration) => patch({ sessionDuration })}
      />

      <div className="pref-field">
        <div className="pref-field-label">每周其他运动（可选）</div>
        <textarea
          className="text-area"
          value={value.otherActivities || ""}
          onChange={(event) => patch({ otherActivities: event.target.value })}
          placeholder="例如：周五打篮球、周日跑步5km"
        />
      </div>

      <div className="pref-field">
        <div className="pref-field-label">身体状况备注（可选）</div>
        <textarea
          className="text-area"
          value={value.healthNotes || ""}
          onChange={(event) => patch({ healthNotes: event.target.value })}
          placeholder="例如：左膝偶尔不适、腰椎需要保护"
        />
      </div>

      {role === "female" && (
        <div className="pref-female-section section-stack">
          <div className="pref-section-title">👩 专属设置</div>

          <div className="pref-field">
            <div className="pref-field-label">上次经期第一天</div>
            <input
              className="text-input"
              type="date"
              value={value.lastPeriodDate || ""}
              onChange={(event) => patch({ lastPeriodDate: event.target.value })}
            />
          </div>

          <OptionGroup
            label="经期周期天数"
            options={CYCLE_LENGTHS}
            value={value.cycleLength}
            onChange={(cycleLength) => patch({ cycleLength })}
          />
        </div>
      )}
    </div>
  );
}
