export const MEAL_SLOTS = [
  { key: "breakfast", label: "早餐" },
  { key: "morningSnack", label: "上午茶" },
  { key: "lunch", label: "午餐" },
  { key: "afternoonSnack", label: "下午茶" },
  { key: "dinner", label: "晚餐" },
  { key: "postWorkout", label: "练后餐" },
];

export const MEAL_KEYS = MEAL_SLOTS.map((slot) => slot.key);

export const DEFAULT_MEALS = {
  breakfast: "燕麦50g + 鸡蛋2个 + 蓝莓",
  morningSnack: "希腊酸奶1杯 + 坚果一小把",
  lunch: "糙米饭 + 鸡胸肉150g + 时蔬",
  afternoonSnack: "香蕉1根 + 黑咖啡（可选）",
  dinner: "清蒸鱼/豆腐 + 大量蔬菜沙拉",
  postWorkout: "乳清蛋白30g + 香蕉（训练后1小时内）",
};

const FALLBACK_MEAL_PROFILES = {
  chestTriA: {
    breakfast: "全麦吐司2片 + 水煮蛋2个 + 小番茄",
    morningSnack: "无糖酸奶150g + 核桃6粒",
    lunch: "糙米饭半碗 + 鸡胸肉150g + 西兰花",
    afternoonSnack: "苹果1个",
    dinner: "清蒸鳕鱼150g + 凉拌黄瓜",
    postWorkout: "乳清蛋白30g + 白米饭80g（胸三头训练后45分钟内）",
  },
  backBiA: {
    breakfast: "燕麦50g + 全蛋1个 + 蛋白1个 + 蓝莓",
    morningSnack: "牛奶200ml + 杏仁10粒",
    lunch: "藜麦饭 + 瘦牛肉120g + 芦笋",
    afternoonSnack: "橙子1个",
    dinner: "三文鱼120g + 大份绿叶蔬菜",
    postWorkout: "乳清蛋白30g + 红薯150g（背二头训练后补充碳水）",
  },
  shoulderLegA: {
    breakfast: "红薯100g + 鸡蛋2个 + 菠菜",
    morningSnack: "希腊酸奶 + 混合莓果",
    lunch: "糙米饭 + 鸡腿肉去皮150g + 彩椒",
    afternoonSnack: "香蕉1根",
    dinner: "豆腐150g + 蘑菇时蔬汤",
    postWorkout: "乳清蛋白30g + 米饭半碗（肩腿大肌群训练后）",
  },
  recoveryCore: {
    breakfast: "燕麦粥 + 鸡蛋白2个 + 奇异果",
    morningSnack: "小把坚果 + 无糖茶",
    lunch: "杂粮饭小份 + 清蒸鱼100g + 时蔬",
    afternoonSnack: "低糖酸奶1杯",
    dinner: "蔬菜汤 + 少量鸡胸肉80g",
    postWorkout: "轻恢复：BCAA + 香蕉半根（低强度核心/有氧日）",
  },
  basketball: {
    breakfast: "全麦三明治（鸡蛋+生菜）+ 牛奶",
    morningSnack: "能量棒半根 + 补水",
    lunch: "意面小份 + 瘦牛肉100g + 沙拉",
    afternoonSnack: "香蕉1根 + 运动饮料（可选）",
    dinner: "清蒸虾150g + 蔬菜",
    postWorkout: "篮球日：电解质水 + 蛋白粉 + 水果（补糖原）",
  },
  upperHypertrophy: {
    breakfast: "燕麦50g + 全蛋2个 + 花生酱1勺",
    morningSnack: "蛋白棒1根",
    lunch: "糙米饭 + 鸡胸肉180g + 混合蔬菜",
    afternoonSnack: "希腊酸奶 + 蓝莓",
    dinner: "瘦牛肉120g + 烤蔬菜",
    postWorkout: "乳清蛋白35g + 米饭100g（上肢高容量训练后）",
  },
  lowerA: {
    breakfast: "燕麦 + 鸡蛋白3个 + 草莓",
    morningSnack: "酸奶 + 奇亚籽",
    lunch: "糙米饭 + 瘦牛肉130g + 西兰花",
    afternoonSnack: "香蕉半根 + 黑咖啡",
    dinner: "清蒸鱼 + 大份沙拉",
    postWorkout: "乳清蛋白30g + 红薯120g（臀腿训练日）",
  },
  upperA: {
    breakfast: "全麦面包 + 鸡蛋2个 + 牛油果半个",
    morningSnack: "牛奶200ml + 杏仁",
    lunch: "杂粮饭 + 鸡胸肉150g + 时蔬",
    afternoonSnack: "苹果1个",
    dinner: "豆腐煲 + 蔬菜",
    postWorkout: "乳清蛋白30g + 少量米饭（肩背上肢日）",
  },
  lowerB: {
    breakfast: "红薯120g + 鸡蛋2个 + 小番茄",
    morningSnack: "希腊酸奶150g",
    lunch: "糙米饭 + 三文鱼120g + 芦笋",
    afternoonSnack: "蓝莓一小碗",
    dinner: "虾仁150g + 清炒时蔬",
    postWorkout: "乳清蛋白30g + 香蕉1根（下肢强化日）",
  },
  upperB: {
    breakfast: "燕麦50g + 蛋白粉半勺 + 坚果",
    morningSnack: "低糖酸奶",
    lunch: "藜麦 + 鸡胸肉150g + 蔬菜",
    afternoonSnack: "橙子1个",
    dinner: "瘦牛肉100g + 蔬菜汤",
    postWorkout: "乳清蛋白30g + 全麦面包1片（上肢塑形日）",
  },
  cardioRecovery: {
    breakfast: "燕麦粥 + 鸡蛋白2个",
    morningSnack: "水果拼盘小份",
    lunch: "轻食沙拉 + 鸡胸肉100g",
    afternoonSnack: "无糖酸奶",
    dinner: "蔬菜汤 + 豆腐100g",
    postWorkout: "有氧恢复日：椰子水 + 蛋白奶昔（轻量）",
  },
  balletRecovery: {
    breakfast: "全麦吐司 + 鸡蛋1个 + 牛奶",
    morningSnack: "香蕉半根",
    lunch: "意面小份 + 瘦鸡肉100g",
    afternoonSnack: "坚果一小把",
    dinner: "清蒸鱼 + 蔬菜",
    postWorkout: "芭蕾日：补水 + 酸奶 + 少量碳水（课后恢复）",
  },
  activeRecovery: {
    breakfast: "燕麦 + 水果 + 酸奶",
    morningSnack: "温水 + 少量坚果",
    lunch: "轻食碗（糙米小份+鱼+蔬菜）",
    afternoonSnack: "苹果",
    dinner: "蔬菜为主 + 蛋白100g",
    postWorkout: "主动恢复日：蛋白奶昔 + 拉伸后补水（低强度）",
  },
};

const SNACK_ROTATION = [
  { afternoonSnack: "香蕉1根", morningSnack: "希腊酸奶150g" },
  { afternoonSnack: "苹果1个", morningSnack: "牛奶200ml + 杏仁8粒" },
  { afternoonSnack: "蓝莓一小碗", morningSnack: "蛋白棒半根" },
];

export function formatMealsAsHabits(meals) {
  return MEAL_SLOTS.map((slot) => {
    const text = String(meals?.[slot.key] || "").trim();
    return text ? `${slot.label}：${text}` : "";
  }).filter(Boolean);
}

export function buildFallbackMeals(templateKey, day = 1) {
  const base = FALLBACK_MEAL_PROFILES[templateKey] || DEFAULT_MEALS;
  const rotation = SNACK_ROTATION[(Math.max(1, day) - 1) % SNACK_ROTATION.length];
  return {
    ...base,
    morningSnack: rotation.morningSnack || base.morningSnack,
    afternoonSnack: rotation.afternoonSnack || base.afternoonSnack,
  };
}

export function getPlanMealItems(plan) {
  if (plan?.meals && typeof plan.meals === "object") {
    return MEAL_SLOTS.map((slot) => ({
      key: slot.key,
      label: slot.label,
      text: String(plan.meals[slot.key] || "").trim(),
    }));
  }

  return (plan?.habits || []).map((item, index) => ({
    key: String(index),
    label: "",
    text: String(item || "").trim(),
  }));
}

export function usesLegacyRecoveryHabits(plan) {
  if (plan?.meals && typeof plan.meals === "object") return false;
  const habits = plan?.habits || [];
  return habits.some((item) => /Sleep|Stretching|Protein Target|Water 2L|睡眠|拉伸|蛋白质达标|饮水/i.test(String(item)));
}
