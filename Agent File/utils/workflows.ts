
import { WorkflowStep } from '../types';

export const WORKFLOWS: Record<string, WorkflowStep[]> = {
  'New Convert': [
    { day: 0, title: 'Welcome Message', prompt: 'Day 0: Send an immediate, warm welcome message celebrating their decision to join God\'s family. Keep it high energy and assuring.' },
    { day: 1, title: 'Assurance (Voice Note Script)', prompt: 'Day 1: Draft a script for a voice note emphasizing Assurance of Salvation. "You are safe, you are His." Reference 2 Cor 5:17.' },
    { day: 3, title: 'Oxygen Check - Prayer & Word', prompt: 'Day 3: "Oxygen Check". Ask if they have prayed or read the Bible today. Frame it as breathing for the spirit. Simple & encouraging.' },
    { day: 6, title: 'Service Reminder - BBS Class', prompt: 'Day 6: Remind them about Sunday Service tomorrow, specifically the BBS Class (C102/C201). Offer to meet them there.' },
    { day: 8, title: 'Post-Service Check + Doubt Handling', prompt: 'Day 8: Ask how the service/class was yesterday. Gently ask if they have any doubts or questions so far.' },
    { day: 10, title: 'Evangelism Observation Invite', prompt: 'Day 10: Invite them to observe Evangelism this Thursday at 6:30pm (BBS Car Park). No pressure to preach, just come and see family in action.' },
    { day: 13, title: 'Resource: Intimacy w/ God', prompt: 'Day 13: Share a resource (video link or text summary) about developing Intimacy with God. Focus on relationship over religion.' },
    { day: 15, title: 'Lifestyle Check - Habits', prompt: 'Day 15: Friendly check-in on their daily habits. "How is the Bible reading going?" Offer tips for consistency.' },
    { day: 18, title: 'Resource: Purpose', prompt: 'Day 18: Share a resource about God\'s Purpose for their life. "You were made for more."' },
    { day: 20, title: 'Baptism Check', prompt: 'Day 20: Ask if they have been baptized or want to sign up. Explain it as the next exciting step of obedience.' },
    { day: 24, title: 'Discipleship Class Invite', prompt: 'Day 24: Invite them to the official Discipleship Training Class. "Ready to go deeper?"' },
    { day: 28, title: '30-Day Celebration', prompt: 'Day 28: Celebrate their first month! "Look how far you\'ve come!" Ask for a testimony.' },
    { day: 30, title: 'Workforce Recruitment Call', prompt: 'Day 30: The Call to Serve. Invite them to join the workforce/ministry team. "We need your unique gifts."' }
  ],
  'First Timer': [
    { day: 0, title: 'Welcome Text', prompt: 'Day 0: Send a warm text welcoming them for visiting for the first time today. Express genuine joy that they came.' },
    { day: 1, title: 'Voice Note - Personal Thanks', prompt: 'Day 1: Script a personal voice note thanking them specifically for their visit. "It meant a lot to have you with us."' },
    { day: 3, title: 'Value Add - Nahum 1:7', prompt: 'Day 3: Send a value-add message sharing Nahum 1:7 ("The Lord is good, a stronghold in the day of trouble..."). Encourage them with this specific scripture.' },
    { day: 5, title: 'Invite - Sunday Service', prompt: 'Day 5: Warmly invite them back for this upcoming Sunday service. Mention we are looking forward to seeing them again.' },
    { day: 8, title: 'Post-Service Check-in', prompt: 'Day 8: Check in to see if they made it to service yesterday, or how their weekend was if they missed it.' },
    { day: 10, title: 'Intro to Evangelism', prompt: 'Day 10: Briefly introduce the church\'s heart for evangelism/soul winning. "We love sharing the Good News."' },
    { day: 12, title: 'Resource - Purpose Video', prompt: 'Day 12: Share a resource (video or short teaching) about finding one\'s Purpose in God.' },
    { day: 15, title: 'Vision & Belonging', prompt: 'Day 15: Share the vision of the church. "You belong here." Focus on community and family.' },
    { day: 17, title: 'Coffee/Chat Invite', prompt: 'Day 17: Offer a casual meetup (Coffee or a Chat) with a pastor or leader to get to know them better.' },
    { day: 19, title: 'Sunday Anticipation', prompt: 'Day 19: Build anticipation for this coming Sunday. "God is going to move."' },
    { day: 22, title: 'Official Membership Welcome', prompt: 'Day 22: Invite them to consider official membership or joining the family formally. Explain the benefits of belonging.' },
    { day: 24, title: 'Workforce Recruitment Ask', prompt: 'Day 24: Ask if they have interest in serving or volunteering in a department (Workforce Recruitment).' },
    { day: 26, title: 'Expectation Text', prompt: 'Day 26: A message of expectation for what God will do in their life in this season. "Great things are ahead."' }
  ],
  'Born Again': [
    { day: 1, title: 'Connect Text', prompt: 'Day 1 (Fri): A casual but spiritual connection text. "Great meeting you on the field/at outreach. Loved your heart for God."' },
    { day: 2, title: 'Value Check-in', prompt: 'Day 2 (Sat): A quick value check-in. Share a thought or verse that adds value to their weekend. No ask, just give.' },
    { day: 3, title: 'Service Invitation', prompt: 'Day 3 (Sun): Invite them to worship with us today. "If you don\'t have a home church today, we\'d love to host you."' },
    { day: 8, title: 'Vision Voice Note', prompt: 'Day 8 (Mon): Script for a voice note sharing the Vision of the ministry. "We are raising a people of power..."' },
    { day: 10, title: 'Evangelism Invite', prompt: 'Day 10 (Wed): Invite them to join the evangelism team this Thursday. "Iron sharpens iron. Come labor with us."' },
    { day: 12, title: 'Resource: Soul Winning', prompt: 'Day 12 (Fri): Share a resource specifically about Soul Winning or the Great Commission. Appeal to their believer identity.' },
    { day: 15, title: 'Harvest Observation', prompt: 'Day 15 (Mon): Invite them to come observe the harvest (outreach results). "Come see what the Lord is doing."' },
    { day: 19, title: 'Specific Service Invite', prompt: 'Day 19 (Fri): A specific, targeted invite for this Sunday\'s service. Build expectation.' },
    { day: 22, title: 'Family Welcome', prompt: 'Day 22 (Mon): "You fit right in." A text welcoming them to consider this their spiritual family.' },
    { day: 24, title: 'Workforce Recruitment Call', prompt: 'Day 24 (Wed): The Ask. "We see leadership in you. Join the workforce."' },
    { day: 26, title: 'Service Expectation', prompt: 'Day 26 (Fri): Build high expectation for the upcoming service. "Come expecting a miracle."' }
  ]
};

// Generic fallback for custom categories
export const GENERIC_WORKFLOW: WorkflowStep[] = [
  { day: 1, title: 'Welcome', prompt: 'Day 1: Warm welcome and appreciation for connecting.' },
  { day: 7, title: 'Follow-up', prompt: 'Day 7: Checking in to see how they are doing and offering assistance.' },
  { day: 30, title: 'Monthly Check-in', prompt: 'Day 30: A friendly monthly check-in to maintain the relationship.' }
];

const getDaysSinceJoin = (joinDateStr: string): number => {
  const joinDate = new Date(joinDateStr);
  const now = new Date();

  const joinDateMidnight = new Date(joinDate);
  joinDateMidnight.setHours(0, 0, 0, 0);

  const nowMidnight = new Date(now);
  nowMidnight.setHours(0, 0, 0, 0);

  const diffTime = nowMidnight.getTime() - joinDateMidnight.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const getRecommendedWorkflowStep = (joinDateStr: string, category: string): WorkflowStep | null => {
  const diffDays = getDaysSinceJoin(joinDateStr);
  const steps = WORKFLOWS[category] || GENERIC_WORKFLOW;

  // "Grace Period" Logic:
  // We check if there is a step for Today (diffDays)
  // OR if there was a step yesterday (diffDays - 1) or the day before (diffDays - 2) that we might have missed.
  // The system (App.tsx) handles the check of whether a message was ALREADY sent.
  // So here, we simply return the *latest* step that is valid for this window.

  // Priority 1: Exact match for today
  const exactMatch = steps.find(s => s.day === diffDays);
  if (exactMatch) return exactMatch;

  // Priority 2: Catch up (Yesterday or Day before)
  // This ensures if the user doesn't open the app on Day 3, but opens on Day 4, we still generate Day 3.
  const catchUp1 = steps.find(s => s.day === diffDays - 1);
  if (catchUp1) return catchUp1;

  const catchUp2 = steps.find(s => s.day === diffDays - 2);
  if (catchUp2) return catchUp2;

  return null;
};

// New function to predict the FUTURE
export const getNextWorkflowStep = (joinDateStr: string, category: string): { step: WorkflowStep, dueDate: Date } | null => {
  const diffDays = getDaysSinceJoin(joinDateStr);
  const steps = WORKFLOWS[category] || GENERIC_WORKFLOW;

  // Find the first step that is AFTER current days
  // This ensures we show the next upcoming task, not the current day's task
  const nextStep = steps.find(s => s.day > diffDays);

  if (!nextStep) return null;

  const joinDate = new Date(joinDateStr);
  const dueDate = new Date(joinDate);
  dueDate.setDate(dueDate.getDate() + nextStep.day);

  return { step: nextStep, dueDate };
};
