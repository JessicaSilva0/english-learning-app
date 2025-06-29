import React, { useState, useEffect, useRef } from 'react';
import { Send, Target, BarChart3, BookOpen, MessageCircle, Globe, CheckCircle, TrendingUp } from 'lucide-react';

const LanguageLearningTutor = () => {
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState('casual');
  const [userLevel, setUserLevel] = useState('B1');
  
  const [learningGoals, setLearningGoals] = useState([
    { id: 1, text: 'Master past continuous vs simple past', progress: 65, completed: false },
    { id: 2, text: 'Use articles (a, an, the) correctly', progress: 40, completed: false },
    { id: 3, text: 'Improve pronunciation accuracy', progress: 30, completed: false },
    { id: 4, text: 'Expand business vocabulary', progress: 20, completed: false }
  ]);
  
  const [realtimeFeedback, setRealtimeFeedback] = useState([]);
  const [sessionStats, setSessionStats] = useState({
    messagesCount: 0,
    grammarCorrections: 0,
    conversationDuration: 0
  });
  
  const [showFeedback, setShowFeedback] = useState(true);
  const [showProgress, setShowProgress] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [showDailyPractice, setShowDailyPractice] = useState(false);
  
  const [dailyPractice, setDailyPractice] = useState({
    currentStreak: 5,
    todayCompleted: [],
    weeklySchedule: {
      Monday: { type: 'class', completed: false, tasks: ['Review mistakes', 'Class at 3pm', 'Practice grammar'] },
      Tuesday: { type: 'grammar', completed: false, tasks: ['Grammar focus - 30 mins', 'Practice tenses', 'Log mistakes'] },
      Wednesday: { type: 'speaking', completed: false, tasks: ['Voice practice - 25 mins', 'Record yourself', 'Focus on fluency'] },
      Thursday: { type: 'class', completed: false, tasks: ['Prepare questions', 'Class at 3pm', 'Clarify doubts'] },
      Friday: { type: 'listening', completed: false, tasks: ['Watch content - 15 mins', 'Read articles - 15 mins', 'Discuss'] },
      Saturday: { type: 'review', completed: false, tasks: ['Review mistakes', 'Practice - 45 mins', 'Fun activity'] },
      Sunday: { type: 'light', completed: false, tasks: ['Casual chat - 15 mins', 'Plan week', 'Relax'] }
    }
  });
  
  const messagesEndRef = useRef(null);
  const sessionStartTime = useRef(Date.now());
  const languages = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese'];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 1,
        type: 'tutor',
        content: `Hello! I'm your AI language tutor. I see you're working on ${selectedLanguage} at a ${userLevel} level. Let's practice together! What would you like to talk about today?`,
        timestamp: new Date()
      }]);
    }
  }, [selectedLanguage, userLevel]);

  const analyzeMessage = async (userMessage) => {
    try {
      const analysisPrompt = `Analyze this ${selectedLanguage} message from a ${userLevel} level learner: "${userMessage}"
        
        Focus on these areas:
        1. Verb tenses (past continuous vs simple past)
        2. Articles (a, an, the)
        3. Sentence structure
        4. Vocabulary
        
        Respond with JSON only:
        {
          "grammarErrors": [{"error": "mistake", "correction": "fix", "explanation": "why"}],
          "positiveAspects": ["good things"],
          "overallFeedback": "encouraging comment",
          "suggestedImprovement": "next focus"
        }`;

      const response = await window.claude.complete(analysisPrompt);
      return JSON.parse(response);
    } catch (error) {
      return {
        grammarErrors: [],
        positiveAspects: ["Good effort!"],
        overallFeedback: "Keep practicing!",
        suggestedImprovement: "Continue learning"
      };
    }
  };

  const generateTutorResponse = async (userMessage, analysis) => {
    try {
      const prompt = `You are a friendly ${selectedLanguage} tutor for a ${userLevel} student.
        Student said: "${userMessage}"
        Analysis: ${JSON.stringify(analysis)}
        
        Respond naturally and encouragingly. Ask a follow-up question.
        Mode: ${mode}
        
        Response only (no JSON):`;

      const response = await window.claude.complete(prompt);
      return response.trim();
    } catch (error) {
      return "Great! Let's continue practicing. What else would you like to talk about?";
    }
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    setIsLoading(true);
    const userMessage = currentMessage.trim();
    
    setMessages(prev => [...prev, {
      id: Date.now(),
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);
    setCurrentMessage('');

    try {
      const analysis = await analyzeMessage(userMessage);
      
      const newFeedback = [];
      
      if (analysis.grammarErrors && analysis.grammarErrors.length > 0) {
        analysis.grammarErrors.forEach(error => {
          newFeedback.push({
            type: 'correction',
            message: `"${error.error}" → "${error.correction}"`,
            explanation: error.explanation
          });
        });
      }
      
      if (analysis.positiveAspects) {
        analysis.positiveAspects.forEach(aspect => {
          newFeedback.push({
            type: 'positive',
            message: aspect
          });
        });
      }
      
      setRealtimeFeedback(newFeedback);
      
      const tutorResponse = await generateTutorResponse(userMessage, analysis);
      
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'tutor',
        content: tutorResponse,
        timestamp: new Date()
      }]);
      
      setSessionStats(prev => ({
        ...prev,
        messagesCount: prev.messagesCount + 1,
        grammarCorrections: prev.grammarCorrections + (analysis.grammarErrors?.length || 0),
        conversationDuration: Math.floor((Date.now() - sessionStartTime.current) / 60000)
      }));

    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'tutor',
        content: "Let's continue our conversation!",
        timestamp: new Date()
      }]);
    }

    setIsLoading(false);
  };

  const toggleDailyTask = (day, taskIndex, completed) => {
    const taskId = `${day}-${taskIndex}`;
    setDailyPractice(prev => {
      const newCompleted = completed 
        ? [...prev.todayCompleted, taskId]
        : prev.todayCompleted.filter(id => id !== taskId);
      
      const updatedSchedule = { ...prev.weeklySchedule };
      const allTasksCompleted = updatedSchedule[day].tasks.every((_, index) => 
        newCompleted.includes(`${day}-${index}`)
      );
      
      updatedSchedule[day].completed = allTasksCompleted;
      
      return {
        ...prev,
        todayCompleted: newCompleted,
        weeklySchedule: updatedSchedule
      };
    });
  };

  const exportToCalendar = () => {
    let icsContent = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//English App//EN\n';
    
    Object.entries(dailyPractice.weeklySchedule).forEach(([day, schedule], index) => {
      const title = `English ${schedule.type} Practice`;
      icsContent += `BEGIN:VEVENT\n`;
      icsContent += `UID:${Date.now()}-${index}\n`;
      icsContent += `SUMMARY:${title}\n`;
      icsContent += `DESCRIPTION:${schedule.tasks.join(', ')}\n`;
      icsContent += `END:VEVENT\n`;
    });

    icsContent += 'END:VCALENDAR';

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'english-schedule.ics';
    link.click();
    URL.revokeObjectURL(url);
    alert('📅 Calendar file downloaded!');
  };

  const startQuickPractice = (type) => {
    const prompts = {
      grammar: "Let's practice grammar! I'll help you with past tenses.",
      vocabulary: "Time to learn new words! Let's expand your vocabulary.",
      speaking: "Speaking practice time! Let's have a conversation."
    };
    
    setMessages(prev => [...prev, {
      id: Date.now(),
      type: 'tutor',
      content: prompts[type],
      timestamp: new Date()
    }]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex">
      <div className={`flex-1 flex flex-col ${showFeedback ? 'mr-80' : ''} transition-all duration-300`}>
        
        {/* Header */}
        <div className="bg-white shadow-sm border-b p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Globe className="w-6 h-6 text-indigo-600" />
            <select 
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              {languages.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
              Level: {userLevel}
            </span>
            <button
              onClick={() => setMode(mode === 'casual' ? 'structured' : 'casual')}
              className={`px-3 py-1 rounded-full text-sm ${mode === 'casual' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}
            >
              {mode === 'casual' ? 'Casual Chat' : 'Structured'}
            </button>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setShowGoals(!showGoals)}
              className={`p-2 rounded-lg ${showGoals ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500'}`}
            >
              <Target className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowProgress(!showProgress)}
              className={`p-2 rounded-lg ${showProgress ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500'}`}
            >
              <BarChart3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowDailyPractice(!showDailyPractice)}
              className={`p-2 rounded-lg ${showDailyPractice ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500'}`}
            >
              <BookOpen className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowFeedback(!showFeedback)}
              className={`p-2 rounded-lg ${showFeedback ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500'}`}
            >
              <MessageCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Daily Practice Panel */}
        {showDailyPractice && (
          <div className="bg-purple-50 border-b p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-purple-800">📅 Daily Practice</h3>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-purple-600">🔥 {dailyPractice.currentStreak} day streak</span>
                <button 
                  onClick={exportToCalendar}
                  className="px-3 py-1 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                >
                  Export Calendar
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-2 mb-4">
              {Object.entries(dailyPractice.weeklySchedule).map(([day, schedule]) => {
                const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }) === day;
                
                return (
                  <div key={day} className={`p-2 rounded-lg border ${
                    isToday ? 'border-purple-400 bg-purple-100' : 
                    schedule.completed ? 'border-green-400 bg-green-50' : 
                    'border-gray-200 bg-white'
                  }`}>
                    <div className="text-center">
                      <div className="text-sm font-medium">{day.slice(0, 3)}</div>
                      <div className={`text-xs px-1 py-1 rounded mt-1 ${
                        schedule.type === 'class' ? 'bg-blue-100 text-blue-700' :
                        schedule.type === 'grammar' ? 'bg-red-100 text-red-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {schedule.type}
                      </div>
                      
                      {isToday && (
                        <div className="mt-2 space-y-1">
                          {schedule.tasks.map((task, index) => (
                            <label key={index} className="flex items-center text-xs">
                              <input 
                                type="checkbox" 
                                className="w-3 h-3 mr-1"
                                onChange={(e) => toggleDailyTask(day, index, e.target.checked)}
                              />
                              {task}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="bg-white p-3 rounded-lg">
              <h4 className="font-medium mb-2">🎯 Quick Practice</h4>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => startQuickPractice('grammar')}
                  className="p-2 bg-red-50 border border-red-200 rounded hover:bg-red-100"
                >
                  <div className="text-red-700 text-sm">📚 Grammar</div>
                </button>
                <button
                  onClick={() => startQuickPractice('vocabulary')}
                  className="p-2 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                >
                  <div className="text-blue-700 text-sm">📖 Vocab</div>
                </button>
                <button
                  onClick={() => startQuickPractice('speaking')}
                  className="p-2 bg-green-50 border border-green-200 rounded hover:bg-green-100"
                >
                  <div className="text-green-700 text-sm">🎤 Speaking</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Goals Panel */}
        {showGoals && (
          <div className="bg-amber-50 border-b p-4">
            <h3 className="font-semibold text-amber-800 mb-3">🎯 Learning Goals</h3>
            <div className="grid grid-cols-2 gap-3">
              {learningGoals.map(goal => (
                <div key={goal.id} className="bg-white p-3 rounded-lg">
                  <div className="text-sm mb-2">{goal.text}</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-amber-500 h-2 rounded-full"
                      style={{ width: `${goal.progress}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{goal.progress}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Panel */}
        {showProgress && (
          <div className="bg-green-50 border-b p-4">
            <h3 className="font-semibold text-green-800 mb-3">📊 Session Stats</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{sessionStats.messagesCount}</div>
                <div className="text-sm text-gray-600">Messages</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{sessionStats.grammarCorrections}</div>
                <div className="text-sm text-gray-600">Corrections</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{sessionStats.conversationDuration}</div>
                <div className="text-sm text-gray-600">Minutes</div>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(message => (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-md px-4 py-2 rounded-lg ${
                message.type === 'user' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-white text-gray-800 shadow border'
              }`}>
                <p className="text-sm">{message.content}</p>
                <span className="text-xs opacity-70 mt-1 block">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white px-4 py-2 rounded-lg border">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t">
          <div className="flex space-x-2">
            <input
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={`Type in ${selectedLanguage}...`}
              className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !currentMessage.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Sidebar */}
      {showFeedback && (
        <div className="w-80 bg-white border-l shadow-lg overflow-y-auto">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-800">💬 Real-time Feedback</h3>
          </div>
          
          <div className="p-4 space-y-3">
            {realtimeFeedback.length > 0 ? (
              realtimeFeedback.map((feedback, index) => (
                <div key={index} className={`p-3 rounded-lg border-l-4 ${
                  feedback.type === 'positive' ? 'bg-green-50 border-green-400' :
                  feedback.type === 'correction' ? 'bg-red-50 border-red-400' :
                  'bg-blue-50 border-blue-400'
                }`}>
                  <div className={`text-sm font-medium ${
                    feedback.type === 'positive' ? 'text-green-800' :
                    feedback.type === 'correction' ? 'text-red-800' :
                    'text-blue-800'
                  }`}>
                    {feedback.type === 'positive' ? '✅ ' : '🔧 '}
                    {feedback.message}
                  </div>
                  {feedback.explanation && (
                    <p className="text-xs text-gray-600 mt-1">{feedback.explanation}</p>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Start chatting to see feedback!</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t bg-gray-50">
            <h4 className="font-medium text-gray-700 mb-2">Your Focus Areas:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Past continuous: "was/were + -ing"</li>
              <li>• Articles: "a/an" vs "the"</li>
              <li>• Word order in sentences</li>
              <li>• Pronunciation practice</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageLearningTutor;