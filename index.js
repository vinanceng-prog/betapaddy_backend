const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// Replace this with the API key you got from BotFather
const TELEGRAM_BOT_TOKEN = '8174669423:AAFSsVjgWahio-j_kKHfzahTCKzh6tir7-c';
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

const app = express();
app.use(express.json());

// In-memory database for demo (We will replace this with a real database like PostgreSQL later)
let userDatabase = {
  // User data is stored by their Telegram chat ID
  // Example user: 
  123456789: {
    name: "John Adebayo",
    dailyLimit: 10000,
    dailySpent: 7500,
    bankroll: 50000,
    riskLevel: "moderate",
    lossStreak: 0,
    insuranceEligible: false
  }
};

// Function to calculate recommended stake
function calculateStake(userBankroll) {
  return Math.round(userBankroll * 0.02); // 2% of bankroll
}

// Function to simulate getting AI tips (will be replaced with real AI)
function getAITips(userDailySpent, userDailyLimit) {
  const remainingBudget = userDailyLimit - userDailySpent;
  const tips = [
    {
      id: 1,
      match: 'Chelsea vs Arsenal',
      prediction: 'Over 2.5 Goals',
      confidence: 85,
      odds: 1.75,
      stake: 2000,
      status: remainingBudget >= 2000 ? '✅ Available' : '❌ Exceeds Budget'
    },
    {
      id: 2,
      match: 'Man City vs Liverpool',
      prediction: 'Man City Win',
      confidence: 78,
      odds: 2.10,
      stake: 1500,
      status: remainingBudget >= 1500 ? '✅ Available' : '❌ Exceeds Budget'
    }
  ];
  return tips.filter(tip => tip.status === '✅ Available');
}

// Handle the /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name;
  
  // Initialize user in database if not exists
  if (!userDatabase[chatId]) {
    userDatabase[chatId] = {
      name: userName,
      dailyLimit: 10000,
      dailySpent: 0,
      bankroll: 50000,
      riskLevel: "low",
      lossStreak: 0,
      insuranceEligible: false
    };
  }

  const user = userDatabase[chatId];
  const welcomeMessage = `🤖 Welcome *${userName}* to Betapaddy AI, your smarter betting mate! 

💰 *Your Protection Status:*
🏦 Bankroll: ₦${user.bankroll.toLocaleString()}
📊 Daily Spent: ₦${user.dailySpent.toLocaleString()} / ₦${user.dailyLimit.toLocaleString()}
⚖️ Risk Level: ${user.riskLevel.toUpperCase()}

💡 *Quick Actions:*`;

  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🎯 Get Today's Tips", callback_data: 'get_tips' },
          { text: "💰 Log a Bet (₦2K)", callback_data: 'log_bet' }
        ],
        [
          { text: "📊 My Dashboard", callback_data: 'my_dashboard' },
          { text: "🛟 Emergency Help", callback_data: 'emergency_help' }
        ],
        [
          { text: "📈 Insurance Status", callback_data: 'insurance_status' }
        ]
      ]
    },
    parse_mode: 'Markdown'
  };

  bot.sendMessage(chatId, welcomeMessage, options);
});

// Handle button clicks
bot.on('callback_query', (callbackQuery) => {
  const message = callbackQuery.message;
  const chatId = message.chat.id;
  const data = callbackQuery.data;
  const user = userDatabase[chatId];

  if (!user) return;

  switch (data) {
    case 'get_tips':
      const availableTips = getAITips(user.dailySpent, user.dailyLimit);
      
      if (availableTips.length === 0) {
        bot.sendMessage(chatId, `❌ *No Tips Available*\n\nYou've reached your daily limit of ₦${user.dailyLimit.toLocaleString()}. 💡 Try adjusting your limits or wait until tomorrow.`, { parse_mode: 'Markdown' });
      } else {
        let tipsMessage = `🎯 *Today's Top Tips*\n\n`;
        availableTips.forEach(tip => {
          tipsMessage += `⚽ *${tip.match}*\n📊 ${tip.prediction}\n🔥 Confidence: ${tip.confidence}%\n💰 Recommended Stake: ₦${tip.stake.toLocaleString()}\n📈 Odds: ${tip.odds}\n\n`;
        });
        tipsMessage += `💡 *Remember:* Never bet more than you can afford to lose.`;
        bot.sendMessage(chatId, tipsMessage, { parse_mode: 'Markdown' });
      }
      break;

    case 'log_bet':
      const betAmount = 2000;
      const newSpent = user.dailySpent + betAmount;
      const newBankroll = user.bankroll - betAmount;
      
      // Update user data
      user.dailySpent = newSpent;
      user.bankroll = newBankroll;
      user.lossStreak += 1; // Simulating a loss for demo
      
      // Check insurance eligibility
      if (user.lossStreak >= 7) {
        user.insuranceEligible = true;
      }
      
      // Update risk level
      if (newSpent > user.dailyLimit * 0.8) {
        user.riskLevel = "high";
      } else if (newSpent > user.dailyLimit * 0.5) {
        user.riskLevel = "moderate";
      }
      
      let responseMessage = `✅ *Bet Logged Successfully!*\n\n💵 Stake: ₦${betAmount.toLocaleString()}\n💰 New Bankroll: ₦${newBankroll.toLocaleString()}\n📊 Daily Spent: ₦${newSpent.toLocaleString()}/${user.dailyLimit.toLocaleString()}`;
      
      if (newSpent > user.dailyLimit) {
        responseMessage = `🛑 *POCKET GUARD ACTIVATED!*\n\n❌ Daily limit exceeded!\n🔒 Tips paused for protection\n📞 Emergency contact notified`;
        user.riskLevel = "very high";
      } else if (newSpent > user.dailyLimit * 0.8) {
        responseMessage += `\n\n⚠️ *Warning:* You've spent ${Math.round((newSpent/user.dailyLimit)*100)}% of your daily limit`;
      }
      
      bot.sendMessage(chatId, responseMessage, { parse_mode: 'Markdown' });
      break;

    case 'my_dashboard':
      const dashboardMessage = `📊 *Your Protection Dashboard*\n\n🏦 Bankroll: ₦${user.bankroll.toLocaleString()}\n💸 Daily Spent: ₦${user.dailySpent.toLocaleString()}/${user.dailyLimit.toLocaleString()}\n⚖️ Risk Level: ${user.riskLevel.toUpperCase()}\n📉 Loss Streak: ${user.lossStreak} days\n🔒 Insurance: ${user.insuranceEligible ? '✅ Eligible for 20% refund' : '❌ Not eligible'}`;
      bot.sendMessage(chatId, dashboardMessage, { parse_mode: 'Markdown' });
      break;

    case 'emergency_help':
      const emergencyMessage = `🛟 *Emergency Support Activated*\n\n📞 Connecting you with support resources...\n💊 Remember: Betting should be fun, not stressful\n\n🌐 Visit gambleaware.eu for additional resources`;
      bot.sendMessage(chatId, emergencyMessage, { parse_mode: 'Markdown' });
      break;

    case 'insurance_status':
      const insuranceMessage = user.insuranceEligible 
        ? `✅ *Insurance Payout Available!*\n\nYou've had 7+ consecutive losing days.\n💰 20% subscription refund: ₦${Math.round(5000 * 0.2).toLocaleString()}\n💳 Credit has been added to your bankroll` 
        : `📊 *Insurance Status*\n\nYou've had ${user.lossStreak}/7 consecutive losing days\n🔒 Need 7+ losses for 20% refund\n💡 Protection: Active`;
      bot.sendMessage(chatId, insuranceMessage, { parse_mode: 'Markdown' });
      break;
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Betapaddy AI server running on port ${PORT}`);
});

// Handle Telegram webhook setup for production
app.post('/webhook', (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});