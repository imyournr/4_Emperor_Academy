import { Question } from "./types";

export const initialQuestions: Question[] = [
  {
    id: "q1",
    text: "She ____ to school every day.",
    options: ["go", "goes", "went", "going"],
    correctIndex: 1,
    explanation: "ประธาน 'She' เป็นเอกพจน์บุรุษที่ 3 ใน Present Simple Tense (สังเกตคำระบุเวลาบอกความถี่ 'every day') ดังนั้นคำกริยาจึงต้องเติม -s หรือ -es เสมอ (goes)",
    category: "Tenses",
    tags: ["Present Simple", "Grammar"]
  },
  {
    id: "q2",
    text: "By the time the police arrived, the robber ____ already ____.",
    options: ["has / fled", "had / fled", "was / fleeing", "would / flee"],
    correctIndex: 1,
    explanation: "เมื่อเหตุการณ์สองเหตุการณ์เกิดขึ้นต่อเนื่องกันในอดีต เหตุการณ์ที่เกิดและจบลงก่อนจะใช้ Past Perfect (had + V.3) และอีกเหตุการณ์ที่เกิดทีหลังใช้ Past Simple (V.2) ในที่นี้โจรหนีไปก่อนที่ตำรวจจะเดินทางมาถึง",
    category: "Tenses",
    tags: ["Past Perfect", "Past Simple", "Grammar"]
  },
  {
    id: "q3",
    text: "I ____ English for five years before I moved to London.",
    options: ["have been studying", "had been studying", "was studying", "am studying"],
    correctIndex: 1,
    explanation: "Past Perfect Continuous Tense (had been + V.-ing) ใช้เพื่อเน้นย้ำความต่อเนื่องของเหตุการณ์ที่เกิดขึ้นและดำเนินมาอย่างต่อเนื่องเป็นระยะเวลาหนึ่งในอดีต (for five years) ก่อนที่จะมีอีกเหตุการณ์เกิดขึ้นแทรกในอดีต (before I moved)",
    category: "Tenses",
    tags: ["Past Perfect Continuous", "Grammar"]
  },
  {
    id: "q4",
    text: "The manager decided to ____ the meeting because several team members were absent.",
    options: ["call off", "call on", "call out", "call up"],
    correctIndex: 0,
    explanation: "สำนวนกริยา (Phrasal Verb) 'call off' แปลว่า ยกเลิก (cancel) ซึ่งสอดคล้องกับบริบทที่ระบุว่าสมาชิกในทีมหลายคนไม่มาประชุม ส่วน 'call on' แปลว่า แวะเยี่ยม/เรียกร้อง, 'call out' แปลว่า ตะโกนเรียก/ท้าทาย, 'call up' แปลว่า โทรศัพท์หา",
    category: "Vocabulary",
    tags: ["Phrasal Verbs", "Idioms"]
  },
  {
    id: "q5",
    text: "Her performance was so ____ that the audience gave her a standing ovation.",
    options: ["mediocre", "superficial", "spectacular", "monotonous"],
    correctIndex: 2,
    explanation: "คำศัพท์ 'spectacular' แปลว่า น่าตื่นตาตื่นใจ ยอดเยี่ยม ซึ่งสอดคล้องกับการที่ผู้เข้าชมทุกคนลุกขึ้นยืนปรบมือให้เกียรติอย่างล้นหลาม (standing ovation) ส่วน 'mediocre' แปลว่า งั้นๆ ปานกลาง, 'superficial' แปลว่า ผิวเผิน, 'monotonous' แปลว่า ซ้ำซากจำเจ/เสียงโทนเดียว",
    category: "Vocabulary",
    tags: ["Adjectives", "Synonyms"]
  },
  {
    id: "q6",
    text: "Due to heavy traffic, we had to find an ____ route to reach the airport on time.",
    options: ["alternative", "arbitrary", "ambiguous", "authentic"],
    correctIndex: 0,
    explanation: "คำศัพท์ 'alternative' แปลว่า ที่เป็นทางเลือก ซึ่งในบริบทนี้หมายถึง 'alternative route' หรือเส้นทางเลือกอื่นเพื่อเลี่ยงรถติดและไปสนามบินให้ทันเวลา ส่วน 'arbitrary' คือการสุ่ม/ตามใจชอบ, 'ambiguous' แปลว่า กำกวม, 'authentic' แปลว่า แท้จริง/ดั้งเดิม",
    category: "Vocabulary",
    tags: ["Adjectives", "Context Clues"]
  },
  {
    id: "q7",
    text: "Identify the grammatical error: \n(a) Despite of (b) his severe injury, he (c) managed to finish (d) the full marathon.",
    options: ["Despite of", "his severe injury", "managed to finish", "the full marathon"],
    correctIndex: 0,
    explanation: "ผิดที่ส่วน (a) เนื่องจากคำบุพบทบอกความขัดแย้งที่แปลว่า 'ทั้งๆ ที่' จะใช้ 'Despite' เดี่ยวๆ (ไม่มี of ตามหลัง) หรือหากจะใช้ of ต้องใช้ในรูป 'In spite of' เสมอ",
    category: "Error Detection",
    tags: ["Prepositions", "Conjunctions"]
  },
  {
    id: "q8",
    text: "Identify the grammatical error: \nThe news (a) about the global economic crisis (b) were (c) extremely shocking to (d) everyone.",
    options: ["about the global economic crisis", "were", "extremely shocking to", "everyone"],
    correctIndex: 1,
    explanation: "ผิดที่ส่วน (b) เนื่องจากคำนาม 'news' (ข่าวสาร) ถือเป็นคำนามนับไม่ได้ (Uncountable Noun) ซึ่งทำหน้าที่เป็นประธานเอกพจน์เสมอ ดังนั้นคำกริยาที่ใช้จึงต้องเป็นรูปเอกพจน์ คือ 'was' ไม่ใช่ 'were'",
    category: "Error Detection",
    tags: ["Subject-Verb Agreement", "Nouns"]
  },
  {
    id: "q9",
    text: "Identify the grammatical error: \nNeither the teacher (a) nor the students (b) is (c) aware of the (d) recent schedule changes.",
    options: ["nor", "the students", "is", "recent schedule changes"],
    correctIndex: 2,
    explanation: "ผิดที่ส่วน (c) เนื่องจากเมื่อใช้โครงสร้าง 'Neither... nor...' คำกริยาแท้จะผันตามประธานตัวที่อยู่ใกล้กริยาที่สุด ในบริบทนี้คือประธานพหูพจน์ 'the students' ดังนั้นคำกริยาจึงต้องเปลี่ยนจาก 'is' เป็น 'are'",
    category: "Error Detection",
    tags: ["Subject-Verb Agreement", "Correlative Conjunctions"]
  },
  {
    id: "q10",
    text: "A: Would you mind if I borrowed your laptop for a moment?\nB: ____. Go ahead.",
    options: ["Yes, of course", "No, not at all", "Never mind", "Yes, I would mind"],
    correctIndex: 1,
    explanation: "คำถามถามขึ้นต้นด้วย 'Would you mind if...?' แปลว่า 'คุณจะรังเกียจไหมหากฉันขอ...' หากผู้ตอบยินดีให้ยืมและไม่รังเกียจ ต้องตอบปฏิเสธความรังเกียจด้วย 'No, not at all' (ไม่รังเกียจเลย) หรือ 'Of course not' พร้อมเสริมว่า Go ahead (เอาเลย) การตอบ Yes จะแปลว่าเราเจตนารังเกียจและปฏิเสธไม่ให้ยืม",
    category: "Conversation",
    tags: ["Polite Requests", "Daily English"]
  },
  {
    id: "q11",
    text: "A: I passed my English proficiency exam with an A!\nB: ____! I'm so proud of you.",
    options: ["Congratulations", "What a pity", "Cheer up", "Safe travels"],
    correctIndex: 0,
    explanation: "เมื่อคู่สนทนาบอกข่าวดีว่าสอบผ่านได้เกรดดีเยี่ยม เราควรกล่าวแสดงความยินดีด้วยคำว่า 'Congratulations!' (ยินดีด้วยนะ) ส่วน 'What a pity' ใช้แสดงความเสียดาย, 'Cheer up' ใช้ปลอบใจให้ร่าเริงขึ้นเมื่อมีเรื่องเศร้า, 'Safe travels' ใช้เดินทางปลอดภัย",
    category: "Conversation",
    tags: ["Social Expressions", "Congratulations"]
  },
  {
    id: "q12",
    text: "Read the text below:\n'Although sharks are often portrayed in popular media as ruthless man-eating killers, marine biologists emphasize that they are actually crucial for maintaining the delicate balance of the ocean's ecosystems.'\n\nWhat is the main point of this passage?",
    options: [
      "Sharks are dangerous predators that humans should avoid.",
      "Popular media accurately portrays the behavior of sharks.",
      "Sharks play a vital role in keeping marine ecosystems balanced.",
      "Marine biologists recommend hunting sharks to protect humans."
    ],
    correctIndex: 2,
    explanation: "ใจความหลักของย่อหน้านี้กล่าวว่า แม้ฉลามมักจะถูกสื่อวาดภาพให้เป็นฆาตกรกินคนอันโหดเหี้ยม แต่นักชีววิทยาทางทะเลเน้นย้ำว่าพวกมันมีความสำคัญอย่างยิ่งต่อการรักษาสมดุลอันบอบบางของระบบนิเวศในมหาสมุทร (crucial for maintaining the delicate balance of the ocean's ecosystems) ซึ่งตรงกับตัวเลือกข้อ 3",
    category: "Reading",
    tags: ["Main Idea", "Reading Comprehension"]
  }
];
