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

exports.getPNLSummaryReport = async (req, res) => {
  try {
    const userid = req.user?.cost_center_name;
    const { glyear, company } = req.query;

    if (!glyear || !company) {
      return res.status(400).json({ message: 'Missing glyear or company' });
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const glItems = await GLMaster.find({
      type: 'PL',
      lvl1: { $type: 'number' },
      lvl2: { $type: 'number' },
      lvl3: { $type: 'number' }
    });

    const budgetData = await BudgetInput.find({
      userid,
      glyear: parseInt(glyear),
      currency: 'MYR'
    });

    const inputMap = {};
    budgetData.forEach(entry => {
      inputMap[entry.gl_code] = entry.values;
    });

    const summary = {
      revenue: 0,
      total_pre_need_sales: 0,
      total_as_need_sales: 0,
      cost_of_sales: 0,
      total_pre_need_cost_of_sales: 0,
      total_as_need_cost_of_sales: 0,
      total_cost_of_sales: 0,
      gross_profit: 0,
      non_operating_income: 0,
      total_selling_distribution_expenses: 0,
      total_administrative_other_operating: 0,
      total_operating_expense: 0,
      profit_before_interest_tax: 0,
      depreciation_expenses: 0,
      profit_from_operating: 0,
      finance_cost: 0,
      profir_before_taxtation: 0,
      tax_expenses: 0, // no yet got formula
      net_profit_after_tax: 0,
      share_on_profit_loss: 0, // no yet got formula
      other_comprehensive_income_loss: 0,// no yet got formula
      dividend_expense: 0 ,// no yet got formula
      changes_in_retained_earning: 0,// no yet got formula
      retained_profit_carried_forward: 0
    };

    glItems.forEach(gl => {
      const totalValue = months.reduce((sum, month) => sum + (inputMap[gl.gl_code]?.[month] || 0), 0);

      if (gl.sub1 === 'REVENUE') {
        summary.revenue += totalValue;
        if (gl.sub2 === 'PRE-NEED SALES') {
          summary.total_pre_need_sales += totalValue;
        } else if (gl.sub2 === 'AS-NEED SALES') {
          summary.total_as_need_sales += totalValue;
        }
      }

      if (gl.sub1 === 'COST OF SALES') {
        summary.cost_of_sales += totalValue;
        if (gl.sub2 === 'PRE-NEED COST OF SALES') {
          summary.total_pre_need_cost_of_sales += totalValue;
        } else if (gl.sub2 === 'AS-NEED COST OF SALES') {
          summary.total_as_need_cost_of_sales += totalValue;
        } else if (gl.sub2 === 'COST OF SALES') {
          summary.total_cost_of_sales += totalValue;
        }
        
      }
      if (gl.sub1 === 'NON-OPERATING INCOME AND LOSSES') {
        summary.non_operating_income += totalValue;
        if (gl.sub2 === 'SELLING & DISTRIBUTION EXPENSE') {
          summary.total_selling_distribution_expenses += totalValue;
        } else if (gl.sub2 === 'ADMINISTRATIVE & OTHER OPERATING EXPENSE') {
          summary.total_administrative_other_operating += totalValue;
        }
      }

      if (gl.sub1 === 'PROFIT BEFORE INTEREST,TAXATION,DEPRECIATION' && gl.sub_title == 'DEPRECIATION EXPENSES') {
        summary.depreciation_expenses += totalValue; 
      }

      if (gl.sub_title === 'EXTERNAL FINANCE COST' || gl.sub_title == 'INTERNAL FINANCE COST' || gl.sub_title == 'OTHER FINANCE COST') {
        summary.finance_cost += totalValue; 
      }

    });

    summary.gross_profit = summary.revenue - summary.total_cost_of_sales;
    summary.total_operating_expense = summary.total_selling_distribution_expenses + summary.total_administrative_other_operating;

    summary.profit_before_interest_tax = summary.gross_profit + summary.non_operating_income - summary.total_operating_expense;

    summary.profit_from_operating = summary.profit_before_interest_tax - summary.depreciation_expenses;
    summary.profir_before_taxtation = summary.profit_from_operating - summary.finance_cost
    summary.net_profit_after_tax = summary.profir_before_taxtation - summary.tax_expenses

    summary.retained_profit_carried_forward = summary.net_profit_after_tax - summary.share_on_profit_loss - summary.other_comprehensive_income_loss - summary.dividend_expense - summary.changes_in_retained_earning
    return res.json({ summary });
  } catch (err) {
    console.error('❌ Failed to generate PNL Summary Report:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};


