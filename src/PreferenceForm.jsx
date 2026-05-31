import {
  CYCLE_LENGTHS,
  EQUIPMENT_OPTIONS,
  FITNESS_LEVELS,
  getGoalsForRole,
  SESSION_DURATIONS,
  TRAINING_SPLITS,
} from "./preferenceProfile";
import { Button } from "./components/ui";

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

function MultiOptionGroup({ label, hint, options, values, onChange }) {
  const selected = Array.isArray(values) ? values : values ? [values] : [];

  function toggle(value) {
    if (selected.includes(value)) {
      if (selected.length === 1) return;
      onChange(selected.filter((item) => item !== value));
      return;
    }
    onChange([...selected, value]);
  }

  return (
    <div className="pref-field">
      <div className="pref-field-label">{label}</div>
      {hint ? <div className="pref-field-hint">{hint}</div> : null}
      <div className="role-toggle-grid pref-option-grid">
        {options.map((option) => (
          <Button
            key={String(option.value)}
            className={`role-btn ${selected.includes(option.value) ? "is-active" : ""}`}
            onClick={() => toggle(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function TrainingLevelPicker({ value, onChange }) {
  const activeValue = FITNESS_LEVELS.some((item) => item.value === value) ? value : "beginner";
  const activeLevel = FITNESS_LEVELS.find((item) => item.value === activeValue);

  return (
    <div className="pref-field">
      <div className="pref-field-label">训练等级</div>
      <div className="pref-level-list">
        {FITNESS_LEVELS.map((level) => {
          const isActive = activeValue === level.value;
          return (
            <button
              key={level.value}
              type="button"
              className={`pref-level-card ${isActive ? "is-active" : ""}`}
              onClick={() => onChange(level.value)}
            >
              <div className="pref-level-head">
                <span className="pref-level-tier">{level.tier}</span>
                <span className="pref-level-name">{level.label}</span>
                <span className="pref-level-duration">{level.duration}</span>
              </div>
              {isActive && (
                <div className="pref-level-body">
                  {level.traits.length > 0 && (
                    <div className="pref-level-block">
                      <div className="pref-level-block-title">特点</div>
                      <ul className="pref-level-tags">
                        {level.traits.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {level.recommendations.length > 0 && (
                    <div className="pref-level-block">
                      <div className="pref-level-block-title">推荐</div>
                      <ul className="pref-level-tags">
                        {level.recommendations.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
      {activeLevel && (
        <div className="pref-level-summary">
          已选：{activeLevel.tier} {activeLevel.label} · 推荐 {activeLevel.recommendations.join("、")}
        </div>
      )}
    </div>
  );
}

export default function PreferenceForm({ role, value, onChange }) {
  function patch(fields) {
    onChange({ ...value, ...fields });
  }

  return (
    <div className="pref-form section-stack">
      <TrainingLevelPicker
        value={value.fitnessLevel}
        onChange={(fitnessLevel) => patch({ fitnessLevel })}
      />

      <MultiOptionGroup
        label={role === "female" ? "训练目标（女生，可多选）" : "训练目标（男生，可多选）"}
        hint="至少选择 1 项，再次点击可取消"
        options={getGoalsForRole(role)}
        values={value.goals || value.goal || []}
        onChange={(goals) => patch({ goals })}
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

      <OptionGroup
        label="训练部位分化"
        options={TRAINING_SPLITS}
        value={value.trainingSplit || "push_pull_legs"}
        onChange={(trainingSplit) => patch({ trainingSplit })}
      />

      <div className="pref-field">
        <div className="pref-field-label">每周其他运动（可选）</div>
        <div className="pref-field-hint">用自然语言描述即可，AI 会理解。例如：周日爬山、周一羽毛球、周四晚上芭蕾课</div>
        <textarea
          className="text-area"
          value={value.otherActivities || ""}
          onChange={(event) => patch({ otherActivities: event.target.value })}
          placeholder="例如：周日去爬山；周一打羽毛球；周四晚上芭蕾课；周五打篮球"
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
            <p className="pref-field-hint">
              填写最近一次月经来潮的日期，系统会按周期推算<strong>下一次</strong>
              经期；只有 21 天挑战正好碰上预测经期时，计划才会安排经期调整日。
            </p>
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
