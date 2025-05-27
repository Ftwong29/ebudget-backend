const GLMaster = require('../models/gl_master');
const BudgetInput = require('../models/budget_input');

exports.getPNLReport = async (req, res) => {
  try {
    const userid = req.user?.cost_center_name;
    const { glyear, company } = req.query;

    if (!glyear || !company) {
      return res.status(400).json({ message: 'Missing glyear or company' });
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Helper: Empty month object
    const emptyValues = () => months.reduce((acc, m) => {
      acc[m] = 0;
      return acc;
    }, {});

    // 1. Load GL with valid level structure
    const glItems = await GLMaster.find({
      type: 'PL',
      lvl1: { $type: 'number' },
      lvl2: { $type: 'number' },
      lvl3: { $type: 'number' }
    });

    
    // 2. Load budget inputs
    const budgetData = await BudgetInput.find({
      userid,
      glyear: parseInt(glyear),
      currency: 'MYR'
    });

    // 3. Build map: gl_code → monthly values
    const inputMap = {};
    for (const entry of budgetData) {
      inputMap[entry.gl_code] = entry.values;
    }

    console.log("glItems, ",glItems[0])
    // 4. Combine and normalize records
    const records = glItems.map(gl => ({
      lvl1: gl.lvl1,
      lvl2: gl.lvl2,
      lvl3: gl.lvl3,
      gl_code: gl.gl_code,
      gl_account_long_name: gl.gl_account_long_name,
      sub1: gl.sub1,
      sub2: gl.sub2,
      sub_title: gl.sub_title,
      values: months.reduce((acc, m) => {
        acc[m] = inputMap[gl.gl_code]?.[m] || 0;
        return acc;
      }, {})
    }));

    console.log("records, ",records[0])
    // 5. Sort by lvl1 → lvl2 → lvl3 → gl_code
    records.sort((a, b) => (
      a.lvl1 - b.lvl1 ||
      a.lvl2 - b.lvl2 ||
      a.lvl3 - b.lvl3 ||
      a.gl_code - b.gl_code
    ));

    return res.json({ data: records });
  } catch (err) {
    console.error('❌ Failed to generate PNL Report:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
