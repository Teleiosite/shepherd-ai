
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { LayoutDashboard, Users, BookOpen, Send, Menu, Settings as SettingsIcon, MessageCircle, Zap, Loader2, LogOut } from 'lucide-react';
import Dashboard from './components/Dashboard';
import ContactsManager from './components/ContactsManager';
import KnowledgeBase from './components/KnowledgeBase';
import CampaignScheduler from './components/CampaignScheduler';
import LiveChats from './components/LiveChats';
import Settings from './components/Settings';
import Auth from './components/Auth';
import WorkflowsManager from './components/WorkflowsManager';
import Groups from './pages/Groups';
import { Contact, KnowledgeResource, MessageLog, ContactCategory, MessageStatus, DEFAULT_CATEGORIES, WorkflowStep, User } from './types';
import { v4 as uuidv4 } from 'uuid';
import { generateMessage } from './services/geminiService';
import { getRecommendedWorkflowStep } from './utils/workflows';
import { whatsappService } from './services/whatsappService';
import { authService } from './services/authService';
import { storage } from './services/storage';

// Mock Data for Initial Load
const initialContacts: Contact[] = [
  { id: '1', name: 'John Okeke', phone: '+2348012345678', category: ContactCategory.NEW_CONVERT, joinDate: new Date().toISOString(), notes: 'Accepted Christ on Sunday', status: 'Active' },
  { id: '2', name: 'Sarah Williams', phone: '+2348087654321', category: ContactCategory.FIRST_TIMER, joinDate: new Date(Date.now() - 86400000).toISOString(), notes: 'Invited by Grace', status: 'Active' },
  { id: '3', name: 'Pastor Mike', phone: '+2348099887766', category: ContactCategory.BORN_AGAIN, joinDate: new Date(Date.now() - 100000000).toISOString(), notes: 'Leader', status: 'Active' },
];

const newConvertPlanContent = `30-Day New Convert Discipleship Plan

Operation Win Bu Spiritual Growth Track

Target Audience: Individuals who recently gave their life to Christ (Altar Call or Evangelism).
Goal: Establish salvation assurance, build spiritual habits, and integrate into the workforce.

Week 1: Foundation (Assurance of Salvation)

Goal: Ensure they know they are saved and start talking to God.

Day 0 (Immediate - Within 2 hours)
Method: SMS / WhatsApp Text
"Welcome to the family, [Name]! The angels are rejoicing over you today, and so are we! Remember 2 Corinthians 5:17 - 'If anyone is in Christ, he is a new creation.' Your past is gone; a new life has begun. Rest well tonight! - Pastor [Your Name]"

Day 1 (Morning)
Method: Personal Voice Note
"Good morning [Name]. I am so proud of the decision you made. I want to assure you that this is not about feelings; it is about God’s promise. Jesus said, 'Him that comes to me I will in no wise cast out.' You are safe in His hands. Have a blessed day!"

Day 3 (Wednesday)
Method: The "Oxygen" Check (Prayer & Word)
"Hi [Name]. Just checking in! In this new walk, Prayer is your breath and the Bible is your food.

Read: John 1:1-5 today.

Pray: Just talk to God like a Father.
Let me know if you have a Bible, or we can help you get one!"

Day 6 (Saturday)
Method: Service Reminder
"Happy Weekend [Name]! Can’t wait to see you at your first service as a new believer tomorrow! 6pm at BBS Class (C102/C201). Come expecting God to speak to you. See you there!"

Week 2: Identity (Who You Are Now)

Goal: Overcoming doubt and understanding the Holy Spirit.

Day 8 (Monday) "Happy Monday [Name]! Trust you had a blessed weekend. It is Pastor [Your Name] here. I wanted to check in were you able to make it to fellowship yesterday? We are praying for you either way, and if the enemy tried to whisper doubts to you? Remind him of Romans 8:1 - 'There is no condemnation for those in Christ Jesus.' You are forgiven!"

Day 10 (Wednesday)
Method: Evangelism Invitation (Observation)
"Hello [Name]. One way we grow is by seeing others share their faith. We are going out for Evangelism tomorrow (Thursday) at 6:30pm at BBS Car Park. You don’t have to preach—just come and watch the family in action! Would you like to join?"

Day 13 (Saturday)
Method: Resource (Intimacy with God)
"Hi [Name]. As you grow, you need power, and that power comes from relationship.
I want you to watch this powerful message by Apostle Joshua Selman on Keys to Intimacy with God.

Watch here: https://www.youtube.com/watch?v=cNA5lJ-3Qbw

The Holy Spirit is your Helper. Read Acts 1:8 this weekend too. Praying for you!"

Week 3: Purpose & Lifestyle

Goal: Separation from the world and finding purpose.

Day 15 (Monday)
"Happy new week [Name]! As a believer, we are in the world but not of it. This week, ask God: 'What habits do I need to change to please You?' I’m here if you have questions about challenges you are facing."

Day 18 (Thursday)
Method: The "Purpose" Video
"Hi [Name]. Many people ask, 'Why am I here?' I want you to watch this short clip by Apostle Joshua Selman on Finding Purpose. It will bless you massive.

Watch here: https://www.youtube.com/shorts/8HFpQ0M7tqs

Let me know what you think!"

Day 20 (Saturday)
Method: Baptism Check
"Hi [Name]. In the Bible, after people believed, they were baptized. It is an outward sign of your inner change. Are you ready to take that step? We have a baptism coming up soon!"

Week 4: Integration (From Convert to Disciple)

Goal: Joining the workforce and taking responsibility.

Day 24 (Wednesday)
Method: Discipleship Invite
"Hello [Name]. You have been growing so fast! We have a Believers' Class/Discipleship group where we go deeper into the Word. I think you are ready for it. Can I send you the details?"

Day 28 (Sunday Night)
"30 Days! [Name], can you believe it has been a month since you gave your life to Christ? Look at how you are growing. I am so proud of you. This is just the beginning."

Day 30 (Tuesday)
Method: The "Next Level" Call
"Hi [Name]. Now that you are established, it’s time to serve. God gave you gifts to build His kingdom. Let’s chat this Sunday about where you can fit into the Operation Win Bu workforce. The harvest is plenty!"

AI Triggers (Special Cases)

If they text: "I sinned / I messed up"

Response: "Don't run from God, run to Him. 1 John 1:9 says if we confess, He is faithful to forgive. This is a stumble, not a fall. Get back up, [Name]. God loves you."

If they text: "I feel attacked / Bad dreams"

Response: "We have authority in Jesus' name. Read Psalm 91 before you sleep tonight. I am praying agreement with you right now for peace. You are covered by the Blood."

If they stop responding:

Action: Switch to "Re-engagement/Care" mode (gentle check-ins once a week).
`;

const initialResources: KnowledgeResource[] = [
  { id: '101', title: 'New Believers Manual - Chapter 1', type: 'Book', content: 'Welcome to the family of God! Salvation is a free gift...', uploadDate: new Date().toISOString() },
  { id: '102', title: 'Sermon: Faith that Moves Mountains', type: 'Sermon', content: 'Faith is not just believing, it is acting on the Word of God...', uploadDate: new Date().toISOString() },
  { id: '103', title: '30-Day New Convert Follow-Up Plan', type: 'Book', content: newConvertPlanContent, uploadDate: new Date().toISOString() },
];

// Mobile Bottom Navigation Component
const MobileBottomNav = () => {
  const location = useLocation();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 h-16 flex items-center justify-around px-4 shadow-lg">
      <Link to="/" className={`flex flex-col items-center justify-center w-16 h-12 rounded-lg transition-all`}>
        <LayoutDashboard size={20} className={location.pathname === '/' ? 'text-teal-500' : 'text-gray-500'} />
        <span className={`text-[10px] mt-0.5 font-medium ${location.pathname === '/' ? 'text-teal-500' : 'text-gray-600'}`}>Dashboard</span>
      </Link>
      <Link to="/contacts" className={`flex flex-col items-center justify-center w-16 h-12 rounded-lg transition-all`}>
        <Users size={20} className={location.pathname === '/contacts' ? 'text-teal-500' : 'text-gray-500'} />
        <span className={`text-[10px] mt-0.5 font-medium ${location.pathname === '/contacts' ? 'text-teal-500' : 'text-gray-600'}`}>Contacts</span>
      </Link>
      <Link to="/campaigns" className={`flex flex-col items-center justify-center w-16 h-12 rounded-lg transition-all`}>
        <Send size={20} className={location.pathname === '/campaigns' ? 'text-teal-500' : 'text-gray-500'} />
        <span className={`text-[10px] mt-0.5 font-medium ${location.pathname === '/campaigns' ? 'text-teal-500' : 'text-gray-600'}`}>Send</span>
      </Link>
      <Link to="/chats" className={`flex flex-col items-center justify-center w-16 h-12 rounded-lg transition-all`}>
        <MessageCircle size={20} className={location.pathname === '/chats' ? 'text-teal-500' : 'text-gray-500'} />
        <span className={`text-[10px] mt-0.5 font-medium ${location.pathname === '/chats' ? 'text-teal-500' : 'text-gray-600'}`}>Chats</span>
      </Link>
      <Link to="/settings" className={`flex flex-col items-center justify-center w-16 h-12 rounded-lg transition-all`}>
        <SettingsIcon size={20} className={location.pathname === '/settings' ? 'text-teal-500' : 'text-gray-500'} />
        <span className={`text-[10px] mt-0.5 font-medium ${location.pathname === '/settings' ? 'text-teal-500' : 'text-gray-600'}`}>Settings</span>
      </Link>
    </nav>
  );
};

function App() {
  // Authentication State
  const [user, setUser] = useState<User | null>(authService.getCurrentUserSync());
  const [authChecked, setAuthChecked] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = authService.isAuthenticated();
      if (isAuth) {
        // Have token, fetch user data
        const userData = await authService.getCurrentUser();
        setUser(userData);
      } else {
        // No token, clear any old data
        setUser(null);
      }
      setAuthChecked(true);
    };
    checkAuth();
  }, []);

  // Data State - Initialize as empty and load from backend
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoaded, setContactsLoaded] = useState(false);

  const [resources, setResources] = useState<KnowledgeResource[]>(() => {
    try {
      const saved = localStorage.getItem('shepherd_resources');
      return saved ? JSON.parse(saved) : initialResources;
    } catch (e) {
      console.error("Failed to parse resources", e);
      return initialResources;
    }
  });

  const [logs, setLogs] = useState<MessageLog[]>(() => {
    try {
      const saved = localStorage.getItem('shepherd_logs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse logs", e);
      return [];
    }
  });

  const [aiName, setAiName] = useState<string>(() => {
    return localStorage.getItem('shepherd_ai_name') || "Shepherd AI";
  });

  const [organizationName, setOrganizationName] = useState<string>(() => {
    return localStorage.getItem('shepherd_org_name') || "My Local Church";
  });

  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('shepherd_categories');
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    } catch (e) {
      return DEFAULT_CATEGORIES;
    }
  });

  const [autoRunEnabled, setAutoRunEnabled] = useState<boolean>(() => {
    return localStorage.getItem('shepherd_autorun_enabled') === 'true';
  });

  const [isSidebarOpen, setSidebarOpen] = useState(() => {
    // Start closed on mobile, open on desktop
    return window.innerWidth >= 768;
  });
  const [autoRunProgress, setAutoRunProgress] = useState<{ current: number, total: number } | null>(null);

  // Load contacts from backend when user authenticates
  useEffect(() => {
    const loadContactsFromBackend = async () => {
      if (!user) {
        setContacts([]);
        setContactsLoaded(false);
        return;
      }

      try {
        console.log('📡 Loading contacts from backend...');
        const backendContacts = await storage.refreshContacts();
        setContacts(backendContacts);
        setContactsLoaded(true);
        console.log(`✅ Loaded ${backendContacts.length} contacts from backend`);
      } catch (error) {
        console.error('Failed to load contacts:', error);
        // Fallback to empty array on error
        setContacts([]);
        setContactsLoaded(true);
      }
    };

    loadContactsFromBackend();
  }, [user]);

  // Persistence - REMOVED contacts localStorage (now using backend)
  // useEffect(() => localStorage.setItem('shepherd_contacts', JSON.stringify(contacts)), [contacts]);
  useEffect(() => localStorage.setItem('shepherd_resources', JSON.stringify(resources)), [resources]);
  useEffect(() => localStorage.setItem('shepherd_resources', JSON.stringify(resources)), [resources]);
  useEffect(() => localStorage.setItem('shepherd_logs', JSON.stringify(logs)), [logs]);
  useEffect(() => localStorage.setItem('shepherd_ai_name', aiName), [aiName]);
  useEffect(() => localStorage.setItem('shepherd_org_name', organizationName), [organizationName]);
  useEffect(() => localStorage.setItem('shepherd_categories', JSON.stringify(categories)), [categories]);

  // AUTOMATION ENGINE: Check for Smart Workflows
  useEffect(() => {
    if (!user) return; // Do not run automation if not logged in

    const runAutomation = async () => {
      const lastRunDate = localStorage.getItem('shepherd_last_autorun_date');
      const todayStr = new Date().toISOString().split('T')[0];

      // Only run if enabled AND not run today
      if (autoRunEnabled && lastRunDate !== todayStr && contacts.length > 0) {
        console.log("Starting Daily Automation Run...");

        // 1. Identify Due Contacts
        const hasSentMessageToday = (contactId: string) => {
          return logs.some(l =>
            l.contactId === contactId &&
            l.timestamp.startsWith(todayStr) &&
            (l.status === MessageStatus.SENT || l.status === MessageStatus.SCHEDULED)
          );
        };

        // Check if contact was added today (they already got welcome message)
        const wasAddedToday = (contact: Contact) => {
          return contact.joinDate.startsWith(todayStr);
        };

        const dueItems = contacts.map(c => {
          const step = getRecommendedWorkflowStep(c.joinDate, c.category);
          return { contact: c, step };
        })
          .filter((item): item is { contact: Contact, step: WorkflowStep } => item.step !== null)
          .filter(item => !hasSentMessageToday(item.contact.id))
          .filter(item => !wasAddedToday(item.contact)) // ✅ FIX: Skip contacts added today
          .sort((a, b) => (a.step.day - b.step.day));

        if (dueItems.length === 0) {
          localStorage.setItem('shepherd_last_autorun_date', todayStr);
          return;
        }

        // 2. Process
        setAutoRunProgress({ current: 0, total: dueItems.length });
        const newLogs: MessageLog[] = [];
        const waConfig = whatsappService.getConfig();

        for (let i = 0; i < dueItems.length; i++) {
          const { contact, step } = dueItems[i];
          try {
            const content = await generateMessage(contact, step.prompt, resources, aiName, organizationName);

            if (waConfig && contact.phone) {
              // Pass contact_id so message gets saved to database for bridge delivery
              await whatsappService.sendMessage(contact.phone, content, undefined, contact.id);
            }

            newLogs.push({
              id: uuidv4(),
              contactId: contact.id,
              content: content,
              timestamp: new Date().toISOString(),
              status: MessageStatus.SENT,
              type: 'Outbound'
            });
          } catch (e) {
            console.error(`Auto-run failed for ${contact.name}`, e);
          }

          setAutoRunProgress({ current: i + 1, total: dueItems.length });
          await new Promise(r => setTimeout(r, 800));
        }

        setLogs(prev => [...newLogs, ...prev]);
        localStorage.setItem('shepherd_last_autorun_date', todayStr);
        setTimeout(() => setAutoRunProgress(null), 2000);

        if (Notification.permission === "granted") {
          new Notification("Shepherd AI", {
            body: `Automation Complete: Sent ${newLogs.length} messages to due contacts.`,
            icon: "/vite.svg"
          });
        }
      }
    };

    const timeout = setTimeout(runAutomation, 1500);
    return () => clearTimeout(timeout);
  }, [contacts, resources, logs, aiName, organizationName, autoRunEnabled, user]);

  // SCHEDULED MESSAGE DELIVERY ENGINE: Check every minute for due scheduled messages
  useEffect(() => {
    if (!user) return; // Do not run if not logged in

    const checkScheduledMessages = async () => {
      const now = new Date();
      const waConfig = whatsappService.getConfig();

      // Find all messages that are scheduled and due
      const dueMessages = logs.filter(log => {
        if (log.status !== MessageStatus.SCHEDULED || !log.scheduledFor) return false;

        const scheduledTime = new Date(log.scheduledFor);
        return scheduledTime <= now;
      });

      if (dueMessages.length === 0) return;

      console.log(`📬 Found ${dueMessages.length} scheduled messages ready to send...`);

      // Process each due message
      for (const msg of dueMessages) {
        try {
          const contact = contacts.find(c => c.id === msg.contactId);

          // Send via WhatsApp if bridge is connected and contact has phone
          if (waConfig && contact?.phone) {
            const result = await whatsappService.sendMessage(contact.phone, msg.content);
            if (result.success) {
              console.log(`✅ Sent scheduled message to ${contact.name}`);
            } else {
              console.error(`❌ Failed to send scheduled message to ${contact.name}`);
            }
          }

          // Update message status regardless of API success (mark as sent)
          setLogs(prev => prev.map(l => {
            if (l.id === msg.id) {
              return {
                ...l,
                status: MessageStatus.SENT,
                timestamp: new Date().toISOString(),
                scheduledFor: undefined
              };
            }
            return l;
          }));

          // Rate limit to avoid spam
          await new Promise(r => setTimeout(r, 500));

        } catch (error) {
          console.error(`Error sending scheduled message:`, error);

          // Mark as failed
          setLogs(prev => prev.map(l => {
            if (l.id === msg.id) {
              return { ...l, status: MessageStatus.FAILED };
            }
            return l;
          }));
        }
      }

      // Notify user
      if (dueMessages.length > 0 && Notification.permission === 'granted') {
        new Notification('Shepherd AI - Scheduled Messages', {
          body: `Sent ${dueMessages.length} scheduled message(s)`,
          icon: '/vite.svg'
        });
      }
    };

    // Check immediately on mount
    checkScheduledMessages();

    // Then check every minute
    const interval = setInterval(checkScheduledMessages, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [logs, contacts, user]); // Dependencies: logs and contacts

  // Auto-inject 30-Day Plan logic...
  useEffect(() => {
    setResources(prev => {
      const index = prev.findIndex(r => r.title === '30-Day New Convert Follow-Up Plan');
      if (index !== -1) {
        if (prev[index].content !== newConvertPlanContent) {
          const updated = [...prev];
          updated[index] = { ...updated[index], content: newConvertPlanContent, uploadDate: new Date().toISOString() };
          return updated;
        }
        return prev;
      } else {
        return [...prev, { id: '103', title: '30-Day New Convert Follow-Up Plan', type: 'Book', content: newConvertPlanContent, uploadDate: new Date().toISOString() }];
      }
    });
  }, []);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // ===== WHATSAPP WEBSOCKET CONNECTION =====
  // Use ref to hold contacts to avoid stale closures and prevent duplicate triggers
  const contactsRef = React.useRef(contacts);
  React.useEffect(() => { contactsRef.current = contacts; }, [contacts]);

  // Track processed message IDs to prevent duplicates
  const processedMessageIds = React.useRef(new Set<string>());

  useEffect(() => {
    if (!user) return;

    const waConfig = whatsappService.getConfig();
    if (waConfig && waConfig.provider === 'venom') {
      console.log('🔌 Connecting to WhatsApp bridge WebSocket...');

      whatsappService.connectToIncoming(
        (messageData) => {
          // Deduplicate messages
          const messageKey = `${messageData.from}-${messageData.timestamp}`;
          if (processedMessageIds.current.has(messageKey)) {
            console.log('⏭️ Skipping duplicate message');
            return;
          }
          processedMessageIds.current.add(messageKey);

          console.log('📩 Received WhatsApp message:', messageData);

          const incomingWhatsappId = messageData.from;
          const incomingPhone = (messageData.phone || messageData.from || '').replace('@c.us', '').replace('@lid', '').replace(/\D/g, '');
          const incomingContactName = messageData.contactName || ''; // Saved name from their phone
          const incomingPushname = messageData.pushname || ''; // WhatsApp display name

          console.log('📞 Looking for contact with:', {
            whatsappId: incomingWhatsappId,
            phone: incomingPhone,
            realPhone: messageData.realPhone, // Debug: Check if bridge sent this
            contactName: incomingContactName,
            pushname: incomingPushname
          });

          // Use ref to get latest contacts (prevents stale closure)
          const currentContacts = contactsRef.current;

          // 1. First try to match by whatsappId
          let contact = currentContacts.find(c =>
            (c as any).whatsappId && (c as any).whatsappId === incomingWhatsappId
          );

          // 2. If no whatsappId match, try phone matching
          if (!contact) {
            contact = currentContacts.find(c => {
              const savedPhone = c.phone.replace(/\D/g, '');
              return savedPhone === incomingPhone ||
                savedPhone.endsWith(incomingPhone.slice(-10)) ||
                incomingPhone.endsWith(savedPhone.slice(-10)) ||
                savedPhone.includes(incomingPhone) ||
                incomingPhone.includes(savedPhone);
            });
          }

          // 3. If still no match, try matching by NAME (contactName or pushname)
          if (!contact && (incomingContactName || incomingPushname)) {
            console.log('🔍 Trying name match with:', { savedContacts: currentContacts.length, incoming: [incomingContactName, incomingPushname] });

            contact = currentContacts.find(c => {
              const savedNameLower = c.name.toLowerCase();
              const incomingNameLower = (incomingContactName || '').toLowerCase();
              const incomingPushnameLower = (incomingPushname || '').toLowerCase();

              // Check if Saved Name is contained in Incoming Names OR Incoming Names contained in Saved Name
              // e.g. "Seye" matches "Oluwaseye" AND "Oluwaseye" matches "Seye"

              const nameMatch = incomingNameLower && (savedNameLower.includes(incomingNameLower) || incomingNameLower.includes(savedNameLower));
              const pushnameMatch = incomingPushnameLower && (savedNameLower.includes(incomingPushnameLower) || incomingPushnameLower.includes(savedNameLower));

              return nameMatch || pushnameMatch;
            });

            if (contact) {
              console.log('✅ Matched by name:', contact.name);
            } else {
              console.log('❌ No name match found among:', currentContacts.map(c => c.name));
            }
          }



          if (contact) {
            console.log('✅ Matched contact:', contact.name);

            // Update whatsappId if not set
            if (!(contact as any).whatsappId && incomingWhatsappId.includes('@')) {
              setContacts(prev => prev.map(c =>
                c.id === contact!.id ? { ...c, whatsappId: incomingWhatsappId } : c
              ));
            }

            const newLog: MessageLog = {
              id: uuidv4(),
              contactId: contact.id,
              content: messageData.body || '[No content]',
              timestamp: new Date((messageData.timestamp || Date.now() / 1000) * 1000).toISOString(),
              status: MessageStatus.RESPONDED,
              type: 'Inbound'
            };

            setLogs(prev => [newLog, ...prev]);

            if (Notification.permission === 'granted') {
              new Notification(`Message from ${contact.name}`, {
                body: (messageData.body || '').substring(0, 100),
                icon: '/vite.svg'
              });
            }
          } else {
            // Check one more time if contact already exists (avoid race condition)
            const alreadyExists = contactsRef.current.some(c =>
              (c as any).whatsappId === incomingWhatsappId ||
              c.phone.replace(/\D/g, '').endsWith(incomingPhone.slice(-10))
            );

            if (alreadyExists) {
              console.log('⏭️ Contact already exists, skipping creation');
              return;
            }

            console.log('📱 Creating new contact for:', incomingPhone);
            const newContactId = uuidv4();

            // Prefer using the real phone if bridge managed to resolve it, otherwise use the extracted ID
            const finalPhone = messageData.realPhone || incomingPhone;
            console.log('📱 finalPhone:', finalPhone, '(from realPhone:', messageData.realPhone, ', incomingPhone:', incomingPhone, ')');

            // Use their WhatsApp Display Name (Pushname) or Saved Name if available
            // Fallback to phone number for better UX
            let displayName: string;

            if (incomingPushname && incomingPushname.trim()) {
              // Best: Use their WhatsApp display name
              displayName = incomingPushname.trim();
            } else if (incomingContactName && incomingContactName.trim()) {
              // Second: Use saved contact name from their phone
              displayName = incomingContactName.trim();
            } else if (finalPhone && finalPhone.length >= 10) {
              // Third: Use phone number formatted nicely
              displayName = `+${finalPhone}`;
            } else {
              // Last resort: Generic name
              displayName = 'Unknown Contact';
            }

            const newContact: Contact = {
              id: newContactId,
              name: displayName,
              phone: finalPhone,
              email: '',
              category: ContactCategory.NEW_CONVERT, // Default category
              notes: `Auto-created from WhatsApp.${incomingPushname ? ` Display name: ${incomingPushname}` : ''}${incomingContactName ? ` Saved as: ${incomingContactName}` : ''}`,
              joinDate: new Date().toISOString(),
              lastContacted: new Date().toISOString(),
              status: 'Active' as const,
              whatsappId: incomingWhatsappId // Correctly store the LID for replies
            };

            setContacts(prev => [...prev, newContact]);

            const newLog: MessageLog = {
              id: uuidv4(),
              contactId: newContactId,
              content: messageData.body || '[No content]',
              timestamp: new Date((messageData.timestamp || Date.now() / 1000) * 1000).toISOString(),
              status: MessageStatus.RESPONDED,
              type: 'Inbound'
            };
            setLogs(prev => [newLog, ...prev]);

            if (Notification.permission === 'granted') {
              new Notification(`New message from ${newContact.name}`, {
                body: (messageData.body || '').substring(0, 100),
                icon: '/vite.svg'
              });
            }

          }
        },
        (status) => {
          console.log('📡 WhatsApp connection status:', status);
        }
      );

      return () => {
        whatsappService.disconnect();
      };
    }
  }, [user]); // Only depend on user, not contacts




  const handleContactAdded = async (contact: Contact, autoGenerate: boolean) => {
    // Save to backend first
    // The backend will automatically create the Day 0 welcome message if autoGenerate is true
    // and a Day 0 workflow exists for this category
    const success = await storage.saveContact(contact);

    if (!success) {
      alert('Failed to save contact. Please try again.');
      return;
    }

    // Refresh contacts from backend to get the updated list with server ID
    const updatedContacts = await storage.refreshContacts();
    setContacts(updatedContacts);

    if (autoGenerate) {
      // The backend creates the Day 0 message with status "Pending"
      // The bridge will pick it up and send it via WhatsApp
      // Refresh logs to show the pending message in Live Chat
      try {
        const savedContact = updatedContacts.find(c => c.phone === contact.phone) || contact;

        // Refresh logs from backend - now returns properly transformed data
        const backendLogs = await storage.refreshLogs();

        // Merge backend logs with local logs (avoiding duplicates)
        setLogs(prev => {
          const existingIds = new Set(prev.map(l => l.id));
          const newLogs = backendLogs.filter((l: MessageLog) => !existingIds.has(l.id));
          return [...newLogs, ...prev];
        });

        console.log('✅ Day 0 welcome message queued for', savedContact.name, '(will be delivered by bridge)');
      } catch (err) {
        console.error("Failed to refresh logs after contact creation:", err);
        // Don't show error to user - the message was likely created successfully
      }
    }
  };

  const handleAddCategory = (newCategory: string) => {
    if (!categories.includes(newCategory)) {
      setCategories(prev => [...prev, newCategory]);
    }
  };

  const handleLogin = async () => {
    const userData = await authService.getCurrentUser();
    setUser(userData);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  const NavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
    const location = useLocation();
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-base ${isActive
          ? 'font-medium'
          : 'hover:bg-white/10'
          }`}
        style={{
          backgroundColor: isActive ? 'var(--teal-500)' : 'transparent',
          color: isActive ? 'white' : 'var(--teal-100)'
        }}
      >
        <Icon size={22} />
        {isSidebarOpen && <span>{label}</span>}
      </Link>
    );
  };

  // Show loading while checking auth
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <HashRouter>
      <div className="flex h-screen bg-gray-50 font-sans text-gray-900">

        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-10 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 ${isSidebarOpen ? 'w-72' : 'md:w-24 w-72'} transition-all duration-300 flex flex-col z-20 fixed md:relative h-full`}
          style={{ backgroundColor: 'var(--forest-500)', color: 'white' }}
        >
          <div className="p-6 h-20 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            {isSidebarOpen && <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--teal-300)' }}>Shepherd AI</h1>}
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg" style={{ color: 'var(--teal-200)', transition: 'background-color 200ms' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
              <Menu size={24} />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
            <NavItem to="/contacts" icon={Users} label="Contacts" />
            <NavItem to="/chats" icon={MessageCircle} label="Live Chats" />
            <NavItem to="/knowledge" icon={BookOpen} label="Knowledge Base" />
            <NavItem to="/workflows" icon={Zap} label="Workflows" />
            <NavItem to="/groups" icon={Users} label="Groups" />
            <NavItem to="/campaigns" icon={Send} label="Generate & Send" />
            <NavItem to="/settings" icon={SettingsIcon} label="Settings" />
          </nav>

          <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-base text-red-600 hover:bg-red-50`}>
              <LogOut size={22} />
              {isSidebarOpen && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto relative">
          <header className="h-16 md:h-20 flex items-center px-4 md:px-8 justify-between sticky top-0 z-10" style={{ backgroundColor: 'var(--forest-500)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Menu size={24} className="text-white" />
              </button>
              <h2 className="text-lg md:text-xl font-semibold text-white truncate">Shepherd AI</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-sm font-bold text-white">{user?.name || 'User'}</span>
                <span className="text-xs text-teal-100">{user?.email || ''}</span>
              </div>
              <div className="bg-teal-400 text-forest-900 px-4 py-1.5 rounded-full text-sm md:text-base font-medium">
                {contacts.length} Souls
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-lg">{(user?.name || 'U').charAt(0).toUpperCase()}</div>
            </div>
          </header>

          <div className="p-4 md:p-8 pb-20 md:pb-8 max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard contacts={contacts} logs={logs} resources={resources} />} />
              <Route path="/contacts" element={<ContactsManager contacts={contacts} setContacts={setContacts} onAddContact={handleContactAdded} categories={categories} onAddCategory={handleAddCategory} />} />
              <Route path="/chats" element={<LiveChats contacts={contacts} logs={logs} setLogs={setLogs} />} />
              <Route path="/knowledge" element={<KnowledgeBase resources={resources} setResources={setResources} />} />
              <Route path="/workflows" element={<WorkflowsManager />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/campaigns" element={<CampaignScheduler contacts={contacts} resources={resources} logs={logs} setLogs={setLogs} aiName={aiName} organizationName={organizationName} categories={categories} />} />
              <Route path="/settings" element={<Settings
                aiName={aiName}
                setAiName={setAiName}
                organizationName={organizationName}
                setOrganizationName={setOrganizationName}
                autoRunEnabled={autoRunEnabled}
                setAutoRunEnabled={setAutoRunEnabled}
              />} />
            </Routes>
          </div>

          {autoRunProgress && (
            <div className="fixed bottom-6 right-6 bg-slate-800 text-white p-4 rounded-lg shadow-xl z-50 flex items-center gap-4 animate-fade-in w-80">
              <Loader2 className="animate-spin text-primary-400" size={24} />
              <div className="flex-1">
                <p className="text-sm font-bold">Auto-Running Workflows...</p>
                <p className="text-xs text-slate-400">Processing {autoRunProgress.current} of {autoRunProgress.total}</p>
                <div className="w-full h-1.5 bg-slate-600 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-primary-500 transition-all duration-300"
                    style={{ width: `${(autoRunProgress.current / autoRunProgress.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </main>

        <MobileBottomNav />
      </div>
    </HashRouter>
  );
}

export default App;
