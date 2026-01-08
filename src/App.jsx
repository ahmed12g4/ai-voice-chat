/* eslint-disable no-unused-vars */
import React, { useState, useRef, useEffect } from "react";
import "./App.css";

const App = () => {
  // حالة المستخدم والمحادثة
  const [messages, setMessages] = useState([
    {
      text: "مرحباً بك في منصتك الذكية! أنا مساعدك الشخصي.\n\nيمكنني مساعدتك في:\n\n1. تصحيح الأخطاء اللغوية والنحوية\n2. تحليل الجمل وشرح القواعد\n3. تحسين مهارات الكتابة\n4. الإجابة على أسئلتك اللغوية\n5. تقديم نصائح لتطوير لغتك\n\nكيف يمكنني مساعدتك اليوم؟",
      isUser: false,
      time: new Date().toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);

  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [pronunciationResult, setPronunciationResult] = useState(null);
  const [currentSentence, setCurrentSentence] = useState("");
  const [userProgress, setUserProgress] = useState({
    points: 150,
    streak: 10,
    accuracy: 88,
    exercisesCompleted: 30,
    wordsLearned: 200,
    level: "متوسط",
    improvements: [],
  });
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [userStats, setUserStats] = useState({
    totalSentences: 50,
    correctSentences: 38,
    commonMistakes: [
      { error: "انا", correction: "أنا", count: 5 },
      { error: "رايح", correction: "رائح", count: 3 },
      { error: "عندي", correction: "عندي", count: 2 },
    ],
    vocabulary: ["مرحباً", "شكراً", "أهلاً", "تفضل", "من فضلك", "لو سمحت"],
  });
  const [userInfo, setUserInfo] = useState({
    name: "المستخدم",
    mood: "عادي",
    lastTopics: ["اللغة", "التكنولوجيا", "القراءة"],
    conversationStyle: "احترافي",
  });

  const [analysisMode, setAnalysisMode] = useState("auto"); // auto, grammar, conversation
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [savedCorrections, setSavedCorrections] = useState([]);

  const chatEndRef = useRef(null);
  const messagesBoxRef = useRef(null);
  const recognitionRef = useRef(null);

  // API Key
  const API_KEY =
    "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";

  // نظام AI محسّن مع تركيز على التصحيح والتحليل
  const callAIAPI = async (message) => {
    try {
      setIsUsingFallback(false);

      const messageType = analyzeMessageType(message);
      const systemPrompt = buildSystemPrompt(messageType);

      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://smart-language-helper.demo",
            "X-Title": "Smart Language Assistant",
          },
          body: JSON.stringify({
            model: "openai/gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: systemPrompt,
              },
              {
                role: "user",
                content: message,
              },
              ...getConversationContext(),
            ],
            temperature: 0.7,
            max_tokens: 800,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.choices && data.choices[0] && data.choices[0].message) {
        const responseText = data.choices[0].message.content;
        updateUserMood(message, responseText);
        return responseText;
      } else {
        throw new Error("Invalid API response structure");
      }
    } catch (error) {
      console.error("Error calling AI API:", error);
      setIsUsingFallback(true);
      return getFallbackResponse(message);
    }
  };

  // بناء برومبت النظام حسب نوع الرسالة
  const buildSystemPrompt = (messageType) => {
    const basePrompt = `أنت مساعد لغوي ذكي متخصص في اللغة العربية. مهمتك الأساسية هي:

**مبادئ أساسية:**
1. التصحيح اللغوي الدقيق مع الشرح الوافي
2. تحليل الأخطاء النحوية والإملائية
3. تقديم البديل الصحيح مع التوضيح
4. شرح القواعد بطريقة مبسطة ومفهومة
5. الإجابة على الأسئلة بدقة ووضوح

**معلومات عن المستخدم:**
- المستوى: ${userProgress.level}
- نمط المحادثة: ${userInfo.conversationStyle}
- الدقة الحالية: ${userProgress.accuracy}%

**تعليمات مهمة:**
- لا تستخدم الرموز التعبيرية (emojis) نهائياً
- استخدم لغة فصحى واضحة ومباشرة
- ركز على الجودة والدقة في التصحيح
- قدم أمثلة عملية عند الحاجة`;

    const modePrompts = {
      correction: `${basePrompt}

**وضع التصحيح النشط:**
عند اكتشاف خطأ:
1. اذكر الخطأ بوضوح
2. اشرح نوع الخطأ (نحوي، إملائي، لغوي)
3. قدم التصحيح الصحيح
4. اشرح القاعدة المتعلقة
5. أعط مثالاً توضيحياً

صيغة الرد:
"وجدت خطأ في: [الكلمة/الجملة]
نوع الخطأ: [نحوي/إملائي/لغوي]
التصحيح: [الصيغة الصحيحة]
الشرح: [توضيح القاعدة]
مثال: [جملة توضيحية]"`,

      question: `${basePrompt}

**وضع الإجابة على الأسئلة:**
- قدم إجابة دقيقة ومباشرة
- استخدم أمثلة عملية
- وضح المفاهيم الصعبة
- اربط المعلومات بالسياق`,

      conversation: `${basePrompt}

**وضع المحادثة:**
- حافظ على أسلوب احترافي ومهذب
- استمع جيداً لما يقوله المستخدم
- قدم تعليقات بناءة ومفيدة
- اقترح تحسينات لغوية عند الإمكان`,

      analysis: `${basePrompt}

**وضع التحليل اللغوي:**
- حلل النص من ناحية البنية والأسلوب
- اذكر نقاط القوة والضعف
- قدم اقتراحات للتحسين
- وضح كيفية تطوير الكتابة`,
    };

    return modePrompts[messageType] || modePrompts.conversation;
  };

  // تحليل نوع الرسالة بذكاء
  const analyzeMessageType = (message) => {
    const lowerMessage = message.toLowerCase();

    // كلمات مفتاحية للتصحيح
    const correctionKeywords = [
      "صحح",
      "خطأ",
      "غلط",
      "صح",
      "صواب",
      "خطئي",
      "أخطأت",
    ];

    // كلمات مفتاحية للأسئلة
    const questionKeywords = [
      "ما",
      "ماذا",
      "كيف",
      "لماذا",
      "متى",
      "أين",
      "من",
      "هل",
      "؟",
    ];

    // كلمات مفتاحية للتحليل
    const analysisKeywords = [
      "حلل",
      "تحليل",
      "راجع",
      "مراجعة",
      "تقييم",
      "قيم",
    ];

    if (correctionKeywords.some((keyword) => lowerMessage.includes(keyword))) {
      return "correction";
    }

    if (analysisKeywords.some((keyword) => lowerMessage.includes(keyword))) {
      return "analysis";
    }

    if (questionKeywords.some((keyword) => lowerMessage.includes(keyword))) {
      return "question";
    }

    // إذا كان النص يحتوي على أخطاء واضحة، فعّل وضع التصحيح
    const hasErrors = detectBasicErrors(message);
    if (hasErrors && analysisMode === "auto") {
      return "correction";
    }

    return "conversation";
  };

  // كشف الأخطاء الأساسية
  const detectBasicErrors = (text) => {
    const errorPatterns = [
      /\bانا\b/,
      /\bانت\b/,
      /\bاللة\b/,
      /\bرايح\b/,
      /\bجاي\b/,
      /\bوين\b/,
      /\bايش\b/,
      /\bشو\b/,
      /\bكانو\b/,
    ];

    return errorPatterns.some((pattern) => pattern.test(text));
  };

  // الحصول على سياق المحادثة
  const getConversationContext = () => {
    const lastMessages = messages.slice(-3).filter((msg) => msg.isUser);
    return lastMessages.map((msg) => ({
      role: "user",
      content: msg.text.substring(0, 150),
    }));
  };

  // تحديث مزاج المستخدم
  const updateUserMood = (userMessage, aiResponse) => {
    const topics = extractTopics(userMessage);
    if (topics.length > 0) {
      setUserInfo((prev) => ({
        ...prev,
        lastTopics: [...new Set([...topics, ...prev.lastTopics.slice(0, 2)])],
      }));
    }
  };

  // استخراج المواضيع من الرسالة
  const extractTopics = (message) => {
    const topics = [];
    const lowerMessage = message.toLowerCase();

    const topicKeywords = {
      اللغة: ["لغة", "عربي", "انجليزي", "فرنسي", "كلمة", "جملة", "قواعد"],
      التكنولوجيا: ["تكنولوجيا", "هاتف", "كمبيوتر", "برمجة", "انترنت"],
      الرياضة: ["رياضة", "كورة", "مباراة", "تمرين", "لياقة"],
      القراءة: ["كتاب", "قراءة", "قصة", "رواية", "مقال"],
      التعليم: ["تعليم", "دراسة", "تعلم", "مدرسة", "جامعة"],
    };

    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some((keyword) => lowerMessage.includes(keyword))) {
        topics.push(topic);
      }
    });

    return topics;
  };

  // رد احتياطي محسّن
  const getFallbackResponse = (message) => {
    const mistakes = analyzeSentenceForMistakes(message);

    if (mistakes.length > 0) {
      let response = "لقد قمت بتحليل الجملة ووجدت بعض النقاط التي يمكن تحسينها:\n\n";

      mistakes.forEach((mistake, index) => {
        response += `${index + 1}. الخطأ: "${mistake.error}"\n`;
        response += `   التصحيح: "${mistake.correction}"\n`;
        response += `   النوع: ${mistake.type}\n`;
        response += `   الشرح: ${mistake.note}\n\n`;
      });

      response +=
        "استمر في التدريب وستلاحظ تحسناً ملحوظاً في مهاراتك اللغوية.";
      return response;
    }

    return "شكراً لك على رسالتك. يمكنني مساعدتك في تصحيح الأخطاء اللغوية أو الإجابة على أسئلتك. كيف يمكنني خدمتك؟";
  };

  // تحليل الجملة لاكتشاف الأخطاء - نظام محسّن
  const analyzeSentenceForMistakes = (sentence) => {
    const mistakes = [];

    // قائمة شاملة بالأخطاء الشائعة
    const commonMistakes = [
      {
        pattern: /\bانا\b/gi,
        correction: "أنا",
        type: "إملائي",
        note: "همزة القطع تكتب على الألف في ضمير المتكلم",
      },
      {
        pattern: /\bانت\b/gi,
        correction: "أنت",
        type: "إملائي",
        note: "همزة القطع تكتب على الألف في ضمير المخاطب",
      },
      {
        pattern: /\bاللة\b/gi,
        correction: "الله",
        type: "إملائي",
        note: "لفظ الجلالة يكتب بهذه الطريقة",
      },
      {
        pattern: /\bرايح\b/gi,
        correction: "ذاهب",
        type: "لغوي",
        note: "استخدم الفعل الفصيح بدلاً من العامية",
      },
      {
        pattern: /\bجاي\b/gi,
        correction: "قادم",
        type: "لغوي",
        note: "استخدم الفعل الفصيح بدلاً من العامية",
      },
      {
        pattern: /\bوين\b/gi,
        correction: "أين",
        type: "لغوي",
        note: "استخدم أداة الاستفهام الفصيحة",
      },
      {
        pattern: /\bايش\b/gi,
        correction: "ماذا",
        type: "لغوي",
        note: "استخدم أداة الاستفهام الفصيحة",
      },
      {
        pattern: /\bشو\b/gi,
        correction: "ما",
        type: "لغوي",
        note: "استخدم أداة الاستفهام الفصيحة",
      },
      {
        pattern: /\bكانو\b/gi,
        correction: "كانوا",
        type: "نحوي",
        note: "الفعل الماضي مع واو الجماعة يحتاج ألف قبل الواو",
      },
      {
        pattern: /\bهو\b/gi,
        correction: "هو",
        type: "تحقق",
        note: "تأكد من استخدام الضمير في سياقه الصحيح",
      },
    ];

    // التحقق من الأخطاء الشائعة
    commonMistakes.forEach((mistake) => {
      const matches = sentence.match(mistake.pattern);
      if (matches) {
        mistakes.push({
          error: matches[0],
          correction: mistake.correction,
          type: mistake.type,
          note: mistake.note,
        });
      }
    });

    // تحليل علامات الترقيم
    if (sentence.length > 20 && !/[.!؟،]/.test(sentence)) {
      mistakes.push({
        error: "نقص علامات الترقيم",
        correction: "إضافة علامات ترقيم مناسبة",
        type: "ترقيم",
        note: "علامات الترقيم تساعد في وضوح المعنى وسهولة القراءة",
      });
    }

    // تحليل بنية الجملة
    const words = sentence.split(/\s+/);
    if (words.length < 3 && !sentence.match(/[؟!.]/)) {
      mistakes.push({
        error: "جملة قصيرة جداً",
        correction: "إضافة المزيد من التفاصيل",
        type: "أسلوب",
        note: "الجمل الكاملة تحتوي على فعل وفاعل ومفعول به أو مكملات",
      });
    }

    return mistakes;
  };

  // تحديث إحصائيات المستخدم
  const updateUserStats = (mistakes) => {
    setUserStats((prev) => {
      const newMistakes = [...prev.commonMistakes];
      mistakes.forEach((mistake) => {
        const existingMistake = newMistakes.find(
          (m) => m.error === mistake.error
        );
        if (existingMistake) {
          existingMistake.count += 1;
        } else {
          newMistakes.push({ ...mistake, count: 1 });
        }
      });

      return {
        ...prev,
        totalSentences: prev.totalSentences + 1,
        commonMistakes: newMistakes
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
      };
    });

    // تحديث التقدم
    setUserProgress((prev) => {
      const newPoints = prev.points + (mistakes.length === 0 ? 30 : 15);
      const newAccuracy = Math.min(
        100,
        Math.round(
          (prev.accuracy * prev.exercisesCompleted +
            (mistakes.length === 0 ? 100 : 70)) /
            (prev.exercisesCompleted + 1)
        )
      );

      let newLevel = prev.level;
      if (prev.exercisesCompleted >= 50 && newAccuracy >= 90) {
        newLevel = "متقدم";
      } else if (prev.exercisesCompleted >= 25 && newAccuracy >= 75) {
        newLevel = "متوسط";
      } else {
        newLevel = "مبتدئ";
      }

      return {
        ...prev,
        points: newPoints,
        exercisesCompleted: prev.exercisesCompleted + 1,
        accuracy: newAccuracy,
        level: newLevel,
        wordsLearned:
          prev.wordsLearned +
          mistakes.filter((m) => m.type === "لغوي").length,
      };
    });
  };

  // التعرف على الصوت وتحويله إلى نص
  const startVoiceRecognition = () => {
    if (!currentSentence) {
      alert("الرجاء اختيار جملة أولاً من قسم الجمل التدريبية");
      return;
    }

    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      const recognition = recognitionRef.current;
      recognition.lang = "ar-SA";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 5;

      let finalTranscript = "";

      recognition.onstart = () => {
        setIsListening(true);
        setPronunciationResult(null);
      };

      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          const comparisonResult = comparePronunciation(
            finalTranscript,
            currentSentence
          );
          setPronunciationResult(comparisonResult);
          setIsListening(false);

          setUserProgress((prev) => ({
            ...prev,
            points: prev.points + comparisonResult.pointsEarned,
          }));
        }
      };

      recognition.onerror = (event) => {
        console.error("Error in speech recognition:", event.error);
        setIsListening(false);

        const mockResult = comparePronunciation(
          currentSentence,
          currentSentence
        );
        mockResult.feedback =
          "نظام التعرف على الصوت غير متاح حالياً. هذه نتيجة تجريبية.";
        setPronunciationResult(mockResult);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();

      setTimeout(() => {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      }, 5000);
    } else {
      setIsListening(true);
      setTimeout(() => {
        setIsListening(false);
        const mockResult = comparePronunciation(
          currentSentence,
          currentSentence
        );
        mockResult.feedback =
          "المتصفح لا يدعم التعرف على الصوت. هذه نتيجة تجريبية.";
        mockResult.userText = currentSentence;
        setPronunciationResult(mockResult);
      }, 2000);
    }
  };

  // مقارنة النطق مع الجملة الأصلية
  const comparePronunciation = (userSpeech, targetSentence) => {
    const userWords = userSpeech.split(/\s+/);
    const targetWords = targetSentence.split(/\s+/);

    let correctWords = 0;
    const mistakes = [];

    const maxWords = Math.max(userWords.length, targetWords.length);
    for (let i = 0; i < maxWords; i++) {
      const userWord = userWords[i] || "";
      const targetWord = targetWords[i] || "";

      if (userWord.toLowerCase() === targetWord.toLowerCase()) {
        correctWords++;
      } else if (userWord && targetWord) {
        const similarity = calculateSimilarity(userWord, targetWord);

        if (similarity > 0.7) {
          correctWords += similarity;
        } else {
          mistakes.push({
            position: i + 1,
            userWord,
            targetWord,
            similarity: Math.round(similarity * 100),
            suggestion: getPronunciationSuggestion(targetWord),
          });
        }
      }
    }

    const wordAccuracy = Math.round((correctWords / targetWords.length) * 100);
    const overallAccuracy = Math.min(100, wordAccuracy);

    let pointsEarned = 0;
    let feedback = "";

    if (overallAccuracy >= 95) {
      pointsEarned = 50;
      feedback = `ممتاز جداً!\nدقة النطق: ${overallAccuracy}%\nأداء رائع، استمر في هذا المستوى.`;
    } else if (overallAccuracy >= 80) {
      pointsEarned = 35;
      feedback = `جيد جداً!\nدقة النطق: ${overallAccuracy}%\nهناك تحسن ملحوظ، استمر في التدريب.`;
    } else if (overallAccuracy >= 60) {
      pointsEarned = 20;
      feedback = `جيد!\nدقة النطق: ${overallAccuracy}%\nيمكنك التحسن بالمزيد من الممارسة.`;
    } else {
      pointsEarned = 10;
      feedback = `يحتاج إلى تحسين\nدقة النطق: ${overallAccuracy}%\nحاول الاستماع للجملة عدة مرات قبل النطق.`;
    }

    if (mistakes.length > 0) {
      feedback += `\n\nالأخطاء المكتشفة:`;
      mistakes.slice(0, 3).forEach((mistake, index) => {
        feedback += `\n${index + 1}. الكلمة ${mistake.position}: نطقت "${
          mistake.userWord
        }" والصحيح "${mistake.targetWord}"`;
      });
    }

    feedback += `\n\nنصيحة: استمع جيداً للنطق الصحيح وكرر المحاولة.`;

    return {
      accuracy: overallAccuracy,
      userText: userSpeech,
      originalText: targetSentence,
      mistakes,
      feedback,
      pointsEarned,
    };
  };

  // حساب تشابه الكلمات
  const calculateSimilarity = (word1, word2) => {
    const longer = word1.length > word2.length ? word1 : word2;
    const shorter = word1.length > word2.length ? word2 : word1;

    if (longer.length === 0) return 1.0;

    let matchingChars = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (shorter[i].toLowerCase() === longer[i].toLowerCase()) {
        matchingChars++;
      }
    }

    return matchingChars / longer.length;
  };

  // تقديم اقتراحات للنطق
  const getPronunciationSuggestion = (word) => {
    return `انطق الكلمة ببطء وبوضوح: ${word
      .split("")
      .join(" - ")} وركز على كل حرف.`;
  };

  // إرسال رسالة للذكاء الاصطناعي
  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = {
      text: inputText.trim(),
      isUser: true,
      time: new Date().toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    // تحليل محلي للأخطاء
    const mistakes = analyzeSentenceForMistakes(inputText.trim());
    if (mistakes.length > 0) {
      updateUserStats(mistakes);

      // حفظ التصحيحات
      setSavedCorrections((prev) => [
        ...prev,
        {
          original: inputText.trim(),
          mistakes: mistakes,
          timestamp: new Date().toISOString(),
        },
      ]);
    }

    try {
      const aiResponse = await callAIAPI(inputText.trim());

      const aiMessage = {
        text: aiResponse,
        isUser: false,
        time: new Date().toLocaleTimeString("ar-EG", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Send message error:", error);
      const errorMessage = {
        text:
          "حدث خطأ في الاتصال. الرجاء المحاولة مرة أخرى.\n\n" +
          getFallbackResponse(inputText.trim()),
        isUser: false,
        time: new Date().toLocaleTimeString("ar-EG", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // التمرير التلقائي لآخر رسالة
  useEffect(() => {
    if (messagesBoxRef.current) {
      const scrollHeight = messagesBoxRef.current.scrollHeight;
      const height = messagesBoxRef.current.clientHeight;
      const maxScrollTop = scrollHeight - height;

      messagesBoxRef.current.scrollTop = maxScrollTop > 0 ? maxScrollTop : 0;
    }
  }, [messages]);

  // إرسال بالضغط على Enter
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // جمل تدريبية حسب المستوى
  const getTrainingSentences = () => {
    const sentencesByLevel = {
      مبتدئ: [
        "مرحباً، كيف حالك اليوم؟",
        "أنا سعيد بلقائك",
        "السماء صافية وجميلة",
        "أحب التعلم والقراءة",
        "شكراً جزيلاً لك",
        "الطقس جميل اليوم",
        "أذهب إلى المدرسة يومياً",
      ],
      متوسط: [
        "أتمنى أن أتحدث اللغة بطلاقة",
        "القراءة توسع الآفاق وتثري العقل",
        "السفر يجعل الإنسان أكثر انفتاحاً",
        "التكنولوجيا غيرت طريقة تعلمنا",
        "الصبر مفتاح النجاح في التعلم",
        "العلم نور والجهل ظلام",
        "الوقت كالسيف إن لم تقطعه قطعك",
      ],
      متقدم: [
        "بإمكاني التعبير عن أفكار معقدة بلغة سليمة",
        "الانغماس في الثقافة يساعد على إتقان اللغة",
        "التحديات اللغوية تطور مهارات التفكير النقدي",
        "الترجمة تتطلب فهماً عميقاً للغتين",
        "التواصل الفعال يعتمد على الفهم الثقافي واللغوي",
        "اللغة العربية غنية بالمفردات والتراكيب",
        "الإبداع في الكتابة يحتاج إلى ممارسة مستمرة",
      ],
    };

    return sentencesByLevel[userProgress.level] || sentencesByLevel.مبتدئ;
  };

  const getRandomSentence = () => {
    const sentences = getTrainingSentences();
    const randomSentence =
      sentences[Math.floor(Math.random() * sentences.length)];
    setInputText(randomSentence);
    setCurrentSentence(randomSentence);
    return randomSentence;
  };

  // إيقاف التعرف على الصوت
  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // مسح المحادثة
  const clearChat = () => {
    if (
      window.confirm(
        "هل أنت متأكد من حذف المحادثة؟ سيتم حذف جميع الرسائل."
      )
    ) {
      setMessages([
        {
          text: `مرحباً بك من جديد يا ${userInfo.name}!\n\nكيف يمكنني مساعدتك اليوم؟`,
          isUser: false,
          time: new Date().toLocaleTimeString("ar-EG", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    }
  };

  // تغيير نمط التحليل
  const changeAnalysisMode = (mode) => {
    setAnalysisMode(mode);

    const modeMessages = {
      auto: "تم التفعيل: التحليل التلقائي - سيتم تحليل رسائلك تلقائياً",
      grammar: "تم التفعيل: وضع التصحيح النحوي - سيتم التركيز على تصحيح الأخطاء",
      conversation:
        "تم التفعيل: وضع المحادثة - سيتم التركيز على المحادثة الطبيعية",
    };

    const modeUpdateMessage = {
      text: modeMessages[mode],
      isUser: false,
      time: new Date().toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, modeUpdateMessage]);
  };

  // مشاركة التقدم
  const shareProgress = () => {
    const progressText = `
تقدمي في المنصة الذكية:
المستوى: ${userProgress.level}
النقاط: ${userProgress.points}
الدقة: ${userProgress.accuracy}%
المفردات المتعلمة: ${userProgress.wordsLearned}
التمارين المكتملة: ${userProgress.exercisesCompleted}

انضم للمنصة الذكية وطور لغتك!
    `.trim();

    if (navigator.share) {
      navigator
        .share({
          title: "تقدمي في المنصة الذكية",
          text: progressText,
        })
        .catch((err) => console.log("Error sharing:", err));
    } else {
      navigator.clipboard
        .writeText(progressText)
        .then(() => {
          alert("تم نسخ التقدم إلى الحافظة!");
        })
        .catch((err) => {
          console.error("Error copying:", err);
        });
    }
  };

  // عرض التحليل التفصيلي
  const toggleDetailedAnalysis = () => {
    setShowDetailedAnalysis(!showDetailedAnalysis);
  };

  return (
    <div className="app">
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="logo">
            <h1>المنصة الذكية - مساعدك اللغوي</h1>
            <div className="user-info">
              <div className="user-level">
                <span className="level-text">{userProgress.level}</span>
                <span className="level-progress">{userProgress.accuracy}%</span>
              </div>
              <div className="user-name">
                <span className="name-label">المستخدم:</span>
                <span className="name-value">{userInfo.name}</span>
              </div>
            </div>
          </div>

          <div className="user-stats">
            <div className="stat-item">
              <div className="stat-value">{userProgress.points}</div>
              <div className="stat-label">النقاط</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">
                {userProgress.exercisesCompleted}
              </div>
              <div className="stat-label">التمارين</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{userProgress.wordsLearned}</div>
              <div className="stat-label">المفردات</div>
            </div>
            <div className="stat-item share-item" onClick={shareProgress}>
              <div className="stat-value">مشاركة</div>
              <div className="stat-label">التقدم</div>
            </div>
          </div>
        </div>
      </nav>

      {/* المحتوى الرئيسي */}
      <main className="main-content">
        <div className="container">
          {/* قسم المحادثة */}
          <div className="chat-section">
            <div className="section-header">
              <div className="header-content">
                <h2>المحادثة والتصحيح اللغوي</h2>
                <p className="subtitle">
                  تحدث بحرية وسأساعدك في تصحيح أخطائك وتحسين لغتك
                </p>
              </div>
              <div className="header-actions">
                <div className="mode-selector">
                  <select
                    value={analysisMode}
                    onChange={(e) => changeAnalysisMode(e.target.value)}
                    className="mode-dropdown"
                  >
                    <option value="auto">تحليل تلقائي</option>
                    <option value="grammar">تصحيح نحوي</option>
                    <option value="conversation">محادثة عامة</option>
                  </select>
                </div>
                <button
                  onClick={toggleDetailedAnalysis}
                  className={`analysis-toggle ${
                    showDetailedAnalysis ? "active" : ""
                  }`}
                >
                  {showDetailedAnalysis ? "إخفاء التحليل" : "عرض التحليل"}
                </button>
                <button onClick={clearChat} className="clear-chat-btn">
                  محادثة جديدة
                </button>
              </div>
            </div>

            <div className="chat-container">
              <div className="messages-box" ref={messagesBoxRef}>
                <div className="messages-container">
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`message-wrapper ${
                        msg.isUser ? "user-wrapper" : "ai-wrapper"
                      }`}
                    >
                      <div
                        className={`message ${
                          msg.isUser ? "user-msg" : "ai-msg"
                        }`}
                      >
                        <div className="message-content">
                          <div className="message-text">{msg.text}</div>
                          <div className="message-meta">
                            <span className="message-sender">
                              {msg.isUser ? "أنت" : "المساعد"}
                            </span>
                            <span className="message-time">{msg.time}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="message-wrapper ai-wrapper">
                      <div className="message ai-msg">
                        <div className="message-content">
                          <div className="typing-container">
                            <div className="typing-indicator">
                              <span></span>
                              <span></span>
                              <span></span>
                            </div>
                            <div className="typing-text">
                              جاري تحليل الرسالة...
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="input-area">
                <div className="input-group">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="اكتب رسالتك هنا... سأقوم بتصحيح أي أخطاء لغوية والإجابة على أسئلتك"
                    rows="3"
                    className="message-input"
                  />
                  <div className="input-actions">
                    <button
                      onClick={() => getRandomSentence()}
                      className="suggest-btn"
                      title="احصل على جملة تدريبية"
                    >
                      جملة تدريبية
                    </button>
                    <div className="voice-control">
                      <button
                        onClick={startVoiceRecognition}
                        disabled={isListening}
                        className="voice-btn"
                        title="تحدث بالصوت"
                      >
                        {isListening ? "جاري التسجيل..." : "تسجيل صوتي"}
                      </button>
                    </div>
                    <button
                      onClick={sendMessage}
                      disabled={isLoading || !inputText.trim()}
                      className="send-btn"
                    >
                      {isLoading ? "جاري الإرسال..." : "إرسال"}
                    </button>
                  </div>
                </div>

                <div className="quick-suggestions">
                  <p className="suggestions-title">اقتراحات سريعة:</p>
                  <div className="suggestions-buttons">
                    <button
                      onClick={() =>
                        setInputText("صحح لي: انا رايح المدرسه")
                      }
                    >
                      طلب تصحيح
                    </button>
                    <button
                      onClick={() => setInputText("ما الفرق بين أن وإن؟")}
                    >
                      سؤال لغوي
                    </button>
                    <button
                      onClick={() =>
                        setInputText("حلل هذه الجملة: الطالب المجتهد ينجح")
                      }
                    >
                      تحليل جملة
                    </button>
                    <button
                      onClick={() =>
                        setInputText("أعطني أمثلة على الفعل الماضي")
                      }
                    >
                      أمثلة تعليمية
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* قسم التحليل التفصيلي */}
            {showDetailedAnalysis && savedCorrections.length > 0 && (
              <div className="detailed-analysis">
                <h3>التصحيحات الأخيرة</h3>
                <div className="corrections-list">
                  {savedCorrections.slice(-5).map((correction, index) => (
                    <div key={index} className="correction-item">
                      <div className="correction-header">
                        <span className="correction-original">
                          النص الأصلي: {correction.original}
                        </span>
                        <span className="correction-time">
                          {new Date(correction.timestamp).toLocaleTimeString(
                            "ar-EG"
                          )}
                        </span>
                      </div>
                      <div className="correction-mistakes">
                        {correction.mistakes.map((mistake, idx) => (
                          <div key={idx} className="mistake-card">
                            <span className="mistake-type">{mistake.type}</span>
                            <span className="mistake-error">
                              {mistake.error}
                            </span>
                            <span className="mistake-arrow">←</span>
                            <span className="mistake-correction">
                              {mistake.correction}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* قسم تحسين النطق */}
          <div className="pronunciation-section">
            <div className="section-header">
              <div className="header-content">
                <h2>تحسين النطق والتدريب الصوتي</h2>
                <p className="subtitle">
                  سجل صوتك وقارنه بالنطق الصحيح لتحسين مهاراتك
                </p>
              </div>
            </div>

            <div className="pronunciation-box">
              <div className="training-card">
                <div className="card-header">
                  <h3>الجملة التدريبية</h3>
                  <div className="card-info">
                    <span className="info-item">
                      المستوى: {userProgress.level}
                    </span>
                    <span className="info-item">
                      النقاط المحتملة: {currentSentence ? "30-50" : "0"}
                    </span>
                  </div>
                </div>

                {currentSentence ? (
                  <div className="current-sentence">
                    <div className="sentence-display">
                      <div className="sentence-text">{currentSentence}</div>
                    </div>
                    <div className="sentence-controls">
                      <button
                        onClick={() => setCurrentSentence("")}
                        className="control-btn change-btn"
                      >
                        تغيير الجملة
                      </button>
                      <button
                        onClick={() => setInputText(currentSentence)}
                        className="control-btn use-btn"
                      >
                        استخدام في المحادثة
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="no-sentence">
                    <div className="selection-guide">
                      <p>اختر جملة للتدريب:</p>
                      <div className="sentence-options">
                        {getTrainingSentences().map((sentence, idx) => (
                          <div
                            key={idx}
                            className="sentence-option"
                            onClick={() => setCurrentSentence(sentence)}
                          >
                            <span className="option-number">{idx + 1}</span>
                            <span className="option-text">{sentence}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="voice-training">
                <div className="training-header">
                  <h4>التدريب الصوتي</h4>
                  <p className="training-description">
                    انقر على زر التسجيل واقرأ الجملة بوضوح
                  </p>
                </div>

                <div className="voice-controls-panel">
                  {isListening ? (
                    <div className="recording-active">
                      <div className="recording-visualizer">
                        <div className="sound-wave"></div>
                        <div className="sound-wave"></div>
                        <div className="sound-wave"></div>
                        <div className="sound-wave"></div>
                        <div className="sound-wave"></div>
                      </div>
                      <button
                        onClick={stopVoiceRecognition}
                        className="record-btn active"
                      >
                        إيقاف التسجيل
                      </button>
                      <p className="recording-status">
                        جاري التسجيل... تحدث بوضوح
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={startVoiceRecognition}
                      disabled={!currentSentence || isListening}
                      className="record-btn"
                    >
                      {currentSentence
                        ? "بدء التسجيل"
                        : "اختر جملة أولاً"}
                    </button>
                  )}
                </div>
              </div>

              {pronunciationResult && (
                <div className="analysis-result">
                  <div className="result-header">
                    <div className="result-title">
                      <h3>نتائج التحليل</h3>
                      <div className="accuracy-display">
                        <div className="accuracy-circle">
                          <span className="accuracy-value">
                            {pronunciationResult.accuracy}%
                          </span>
                          <span className="accuracy-label">الدقة</span>
                        </div>
                      </div>
                    </div>

                    <div className="comparison-view">
                      <div className="comparison-item yours">
                        <div className="comparison-label">ما قلته:</div>
                        <div className="comparison-text">
                          {pronunciationResult.userText}
                        </div>
                      </div>
                      <div className="comparison-item correct">
                        <div className="comparison-label">النطق الصحيح:</div>
                        <div className="comparison-text">
                          {pronunciationResult.originalText}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="feedback-section">
                    <div className="feedback-content">
                      <p>{pronunciationResult.feedback}</p>
                    </div>

                    {pronunciationResult.mistakes.length > 0 && (
                      <div className="mistakes-section">
                        <h4>الأخطاء المكتشفة:</h4>
                        <div className="mistakes-list">
                          {pronunciationResult.mistakes.map((mistake, idx) => (
                            <div key={idx} className="mistake-detail">
                              <div className="mistake-row">
                                <span className="mistake-position">
                                  الكلمة {mistake.position}
                                </span>
                                <span className="mistake-word">
                                  "{mistake.userWord}"
                                </span>
                                <span className="mistake-arrow">←</span>
                                <span className="correct-word">
                                  "{mistake.targetWord}"
                                </span>
                                <span className="similarity">
                                  تشابه: {mistake.similarity}%
                                </span>
                              </div>
                              {mistake.suggestion && (
                                <div className="mistake-suggestion">
                                  نصيحة: {mistake.suggestion}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="improvement-tips">
                    <h4>نصائح للتحسين:</h4>
                    <div className="tips-grid">
                      <div className="tip-card">
                        <div className="tip-icon">استمع</div>
                        <div className="tip-content">
                          <div className="tip-title">الاستماع الجيد</div>
                          <div className="tip-text">
                            استمع للجملة عدة مرات قبل النطق
                          </div>
                        </div>
                      </div>
                      <div className="tip-card">
                        <div className="tip-icon">تمهل</div>
                        <div className="tip-content">
                          <div className="tip-title">النطق البطيء</div>
                          <div className="tip-text">
                            انطق ببطء وركز على كل كلمة
                          </div>
                        </div>
                      </div>
                      <div className="tip-card">
                        <div className="tip-icon">كرر</div>
                        <div className="tip-content">
                          <div className="tip-title">التكرار المستمر</div>
                          <div className="tip-text">
                            كرر التدريب حتى تحصل على دقة عالية
                          </div>
                        </div>
                      </div>
                      <div className="tip-card">
                        <div className="tip-icon">تسجيل</div>
                        <div className="tip-content">
                          <div className="tip-title">المقارنة الذاتية</div>
                          <div className="tip-text">
                            سجل صوتك وقارنه بالنطق الصحيح
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="result-actions">
                    <button
                      onClick={startVoiceRecognition}
                      className="action-btn try-again"
                    >
                      إعادة المحاولة
                    </button>
                    <button
                      onClick={() => {
                        const newSentence = getRandomSentence();
                        setCurrentSentence(newSentence);
                        setPronunciationResult(null);
                      }}
                      className="action-btn new-sentence"
                    >
                      جملة جديدة
                    </button>
                    <button
                      onClick={() => {
                        setInputText(pronunciationResult.originalText);
                        document.querySelector(".message-input")?.focus();
                      }}
                      className="action-btn practice-writing"
                    >
                      تدريب الكتابة
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* قسم الإحصائيات */}
          <div className="statistics-section">
            <div className="section-header">
              <h2>إحصائيات التعلم</h2>
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">مستوى</div>
                <div className="stat-content">
                  <div className="stat-title">المستوى الحالي</div>
                  <div className="stat-value">{userProgress.level}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">نقاط</div>
                <div className="stat-content">
                  <div className="stat-title">إجمالي النقاط</div>
                  <div className="stat-value">{userProgress.points}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">دقة</div>
                <div className="stat-content">
                  <div className="stat-title">نسبة الدقة</div>
                  <div className="stat-value">{userProgress.accuracy}%</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">كلمات</div>
                <div className="stat-content">
                  <div className="stat-title">المفردات المتعلمة</div>
                  <div className="stat-value">{userProgress.wordsLearned}</div>
                </div>
              </div>
            </div>

            {/* الأخطاء الشائعة */}
            {userStats.commonMistakes.length > 0 && (
              <div className="common-mistakes">
                <h3>الأخطاء الشائعة لديك</h3>
                <div className="mistakes-table">
                  <div className="table-header">
                    <span>الخطأ</span>
                    <span>الصواب</span>
                    <span>التكرار</span>
                  </div>
                  {userStats.commonMistakes.map((mistake, index) => (
                    <div key={index} className="table-row">
                      <span className="error-text">{mistake.error}</span>
                      <span className="correction-text">
                        {mistake.correction}
                      </span>
                      <span className="count-badge">{mistake.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="progress-overview">
            <div className="progress-card">
              <div className="progress-title">ملخص التقدم</div>
              <div className="progress-details">
                <div className="progress-item">
                  <span className="item-label">المستوى</span>
                  <span className="item-value">{userProgress.level}</span>
                </div>
                <div className="progress-item">
                  <span className="item-label">الدقة</span>
                  <span className="item-value">{userProgress.accuracy}%</span>
                </div>
                <div className="progress-item">
                  <span className="item-label">المفردات</span>
                  <span className="item-value">
                    {userProgress.wordsLearned}
                  </span>
                </div>
                <div className="progress-item">
                  <span className="item-label">النقاط</span>
                  <span className="item-value">{userProgress.points}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="footer-info">
            <div className="info-content">
              <h3 className="footer-title">المنصة الذكية للتعلم اللغوي</h3>
              <p className="footer-description">
                منصة متكاملة لتعلم اللغة العربية وتحسين المهارات اللغوية من خلال
                التصحيح الذكي والتدريب الصوتي والمحادثة التفاعلية.
              </p>
              <div className="footer-features">
                <span className="feature">تصحيح ذكي</span>
                <span className="feature">تحليل صوتي</span>
                <span className="feature">متابعة التقدم</span>
                <span className="feature">تدريبات متنوعة</span>
                <span className="feature">إحصائيات مفصلة</span>
                <span className="feature">تعلم تفاعلي</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;