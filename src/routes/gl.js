const express = require('express');
const router = express.Router();
const UsersModels = require('../models/user');
const BranchMaster = require('../models/branchs_master');
const GLMaster = require('../models/gl_master');
const BudgetInput = require('../models/budget_input');
const auth = require('../middleware/auth'); // 确保已存在
const decrypt = require('../middleware/decrypt');

const relatedGLCodes = [
  '401011000', '401021000', '401023000', '401025000', '401031000', '401034000',
  '401041000', '401043000', '401045000', '401051000', '401061000', '401071000',
  '401073000', '401081000', '401091000', '401101000', '401111000', '401121000',
  '401136100', '411011000', '411021000', '411023000', '411025000', '411031000',
  '411034000', '411041000', '411043000', '411045000', '411051000', '411061000',
  '411071000', '411072100', '411150000', '411131200', '411131300', '411134100',
  '411136100', '411161000', '423000000', '501012000', '501022000', '501023100',
  '501023200', '501025200', '501026000', '501032000', '501034100', '501034200',
  '501036000', '501038100', '501042000', '501045200', '501046000', '501051000',
  '501061000', '501070100', '501070210', '501101000', '501111200', '501122000',
  '501132100', '512012000', '512022000', '512023100', '512023200', '512025200',
  '512026000', '512032000', '512034100', '512034200', '512036000', '512038100',
  '512042000', '512045200', '512046000', '512051000', '512061000', '512071110',
  '512072200', '512140100', '512142000', '512151000', '512133100', '512161000',
  '523000000', '801301000', '801331000', '801340000', '802110000', '802200000',
  '802310000', '802410000', '804100000', '804500000', '600170000', '601400000',
  '603400000', '607101000', '607260000', '700101000', '700511000', '704510000',
  '711000000', '730100000', '730300000', '730810000', '865100000'
];

const categoryFilterMap = {
  sales: {
    sub2: { $in: ['PRE-NEED SALES', 'AS-NEED SALES', 'REVENUE'] },
    gl_code: { $nin: relatedGLCodes }
  },
  cost: {
    sub2: { $in: ['PRE-NEED COST OF SALES', 'AS-NEED COST OF SALES', 'COST OF SALES'] },
    gl_code: { $nin: relatedGLCodes }
  },
  nonoperating: {
    sub2: { $in: ['NON-OPERATING INCOME AND LOSSES'] },
    gl_code: { $nin: relatedGLCodes }
  },
  direct: {
    sub2: { $in: ['SELLING & DISTRIBUTION EXPENSE'] },
    gl_code: { $nin: relatedGLCodes }
  },
  indirect: {
    sub2: { $in: ['ADMINISTRATIVE & OTHER OPERATING EXPENSE'] },
    sub_title: { $nin: ['DIRECTOR REMUNERATION', 'MANPOWER'] },
    gl_code: { $nin: relatedGLCodes }
  },
  manpower: {
    sub_title: { $in: ['DIRECTOR REMUNERATION', 'MANPOWER'] },
    gl_code: { $nin: relatedGLCodes }
  },
  related: {
    gl_code: { $in: relatedGLCodes }
  }
};

router.get('/glinput-category', auth, async (req, res) => {
  const { category } = req.query;

  if (!category || !categoryFilterMap[category]) {
    return res.status(400).json({ message: 'Invalid or missing category' });
  }

  try {
    const glItems = await GLMaster.find(categoryFilterMap[category]).sort({ gl_code: 1 });

    // 若为 related 分类，额外返回按 company_name 和 profit_center 分组的数据
    if (category === 'related') {
      const branches = await UsersModels.aggregate([
        {
          $group: {
            _id: { company_name: "$company_name", profit_center: "$profit_center" },
            branches: { $push: "$branch" },
            cost_centers: { $push: "$cost_center" },
            currencies: { $addToSet: "$currency" }
          }
        },
        {
          $project: {
            _id: 0,
            company_name: "$_id.company_name",
            profit_center: "$_id.profit_center",
            branches: 1,
            cost_centers: 1,
            currencies: 1
          }
        },
        { $sort: { company_name: 1, profit_center: 1 } }
      ]);

      return res.json({
        glItems,
        groupedData: branches
      });
    }

    // 非 related 正常返回
    res.json({ glItems: glItems });
  } catch (error) {
    console.error(`❌ GL input fetch failed for category \"${category}\":`, error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.post('/glinput-save', auth,decrypt, async (req, res) => {
  const userid = req.user?.cost_center_name;
  const { glyear, currency, values } = req.decryptedData;

  if (!userid || !currency || !glyear || !values) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const bulkOps = [];

    for (const [gl_code, monthlyValues] of Object.entries(values)) {
      bulkOps.push({
        updateOne: {
          filter: { userid, gl_code, glyear },
          update: {
            $set: {
              currency,
              values: monthlyValues
            }
          },
          upsert: true
        }
      });
    }

    if (bulkOps.length > 0) {
      await BudgetInput.bulkWrite(bulkOps);
    }

    res.json({ message: '✅ Budget saved successfully' });
  } catch (err) {
    console.error('❌ Failed to save budget input:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/glinput-load', auth, async (req, res) => {
  const userid = req.user?.cost_center_name;
  const { glyear, category } = req.query;

  if (!userid || !glyear || !category) {
    return res.status(400).json({ message: 'Missing required query params' });
  }

  const glFilter = categoryFilterMap[category];
  if (!glFilter) {
    return res.status(401).json({ message: 'Invalid category' });
  }

  try {
    // 1. 查 GLMaster 获取所有符合分类的 GL 项
    const glItems = await GLMaster.find(glFilter).sort({ gl_code: 1 });
    const glCodes = glItems.map(item => item.gl_code);

    // 2. 查 BudgetInput: 当前年 + 去年
    const currentYear = Number(glyear);
    const previousYear = currentYear - 1;

    const [currentEntries, previousEntries] = await Promise.all([
      BudgetInput.find({ userid, glyear: currentYear, gl_code: { $in: glCodes } }),
      BudgetInput.find({ userid, glyear: previousYear, gl_code: { $in: glCodes } })
    ]);

    // 3. 整理成 Map
    const currentMap = {};
    let lastSavedAt = null;

    for (const entry of currentEntries) {
      currentMap[entry.gl_code] = entry.values;
      if (!lastSavedAt || entry.updatedAt > lastSavedAt) {
        lastSavedAt = entry.updatedAt;
      }
    }

    const previousMap = {};
    for (const entry of previousEntries) {
      previousMap[entry.gl_code] = entry.values;
    }

    // 4. 返回结构
    return res.json({
      current: currentMap,
      previous: previousMap,
      savedAt: lastSavedAt
    });
  } catch (err) {
    console.error('❌ Failed to load categorized budget input:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});



module.exports = router;
router.get('/glinput-load', auth, async (req, res) => {
  const userid = req.user?.cost_center_name;
  const { glyear, category } = req.query;

  if (!userid || !glyear || !category) {
    return res.status(400).json({ message: 'Missing required query params' });
  }

  const glFilter = categoryFilterMap[category];
  if (!glFilter) {
    return res.status(401).json({ message: 'Invalid category' });
  }

  try {
    // 1. 查 GLMaster 获取所有符合分类的 GL 项
    const glItems = await GLMaster.find(glFilter).sort({ gl_code: 1 });
    const glCodes = glItems.map(item => item.gl_code);

    // 2. 查 BudgetInput: 当前年 + 去年
    const currentYear = Number(glyear);
    const previousYear = currentYear - 1;

    const [currentEntries, previousEntries] = await Promise.all([
      BudgetInput.find({ userid, glyear: currentYear, gl_code: { $in: glCodes } }),
      BudgetInput.find({ userid, glyear: previousYear, gl_code: { $in: glCodes } })
    ]);

    // 3. 整理成 Map
    const currentMap = {};
    let lastSavedAt = null;

    for (const entry of currentEntries) {
      currentMap[entry.gl_code] = entry.values;
      if (!lastSavedAt || entry.updatedAt > lastSavedAt) {
        lastSavedAt = entry.updatedAt;
      }
    }

    const previousMap = {};
    for (const entry of previousEntries) {
      previousMap[entry.gl_code] = entry.values;
    }

    // 4. 返回结构
    return res.json({
      current: currentMap,
      previous: previousMap,
      savedAt: lastSavedAt
    });
  } catch (err) {
    console.error('❌ Failed to load categorized budget input:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/glinput-load-related', auth,decrypt, async (req, res) => {
  const { glyear, company, profitCenter, glcode } = req.decryptedData;

  console.log('glyear : ', glyear)
  console.log('company : ', company)

  console.log('profitCenter : ', profitCenter)

  console.log('glcode : ', glcode)

  if (!glyear || !company || !profitCenter || !glcode) {
    return res.status(402).json({ message: 'Missing required body params' });
  }

  try {

    // 2. 准备要查的用户 cost_center_name 列表
    let userCostCenterNames = [];


    if (profitCenter === 'ALL') {
      const users = await UsersModels.find({ company_name: company });
      userCostCenterNames = users.map(u => u.cost_center_name);
    } else {
      const users = await UsersModels.find({
        company_name: company,
        profit_center: profitCenter
      });

      if (!users || users.length === 0) {
        return res.status(404).json({ message: 'Profit center not found under this company' });
      }

      userCostCenterNames = users.map(u => u.cost_center_name);
    }

    console.log('userCostCenterNames : ', userCostCenterNames)

    // 3. 查预算数据（只查当前年度）
    const currentYear = Number(glyear);
    const budgetEntries = await BudgetInput.find({
      userid: { $in: userCostCenterNames },
      glyear: currentYear,
      gl_code: { $in: [glcode] }
    }).lean();

    console.log('budgetEntries : ', budgetEntries)
    // 4. 汇总结果（按 gl_code 累加）
   
    const resultMap = {};
    let lastSavedAt = null;

    for (const entry of budgetEntries) {
      const glCode = entry.gl_code;
      const values = entry.values;

      if (!resultMap[glCode]) {
        resultMap[glCode] = {};
      }

      for (const [month, amount] of Object.entries(values)) {
        resultMap[glCode][month] = (resultMap[glCode][month] || 0) + (parseFloat(amount) || 0);
      }

      if (!lastSavedAt || entry.updatedAt > lastSavedAt) {
        lastSavedAt = entry.updatedAt;
      }
    }

    // 5. 返回结构
    return res.json({
      current: resultMap,
      previous: {}, // 不查 previous
      savedAt: lastSavedAt
    });

  } catch (err) {
    console.error('❌ Failed to load related GL data:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});