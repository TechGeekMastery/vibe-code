/* ------------------------------------------------------------------ added tracks: AI, Python, Network+/Security+ */
SUBJECTS.push(
 {id:'ai', name:'Artificial Intelligence', mono:'AI', color:'#B08FE0', program:true, blurb:'Machine learning to large language models: the math, the models, building real systems, and their risks.', units:[
  {t:'Foundations', n:['What intelligence is: agents, environments, and goals','The history of AI: symbolic AI, learning, and the AI winters','Machine learning 101: supervised, unsupervised, and reinforcement learning','The training pipeline: data, features, model, evaluation','Probability for ML: distributions, likelihood, and Bayes','Linear algebra for ML: vectors, matrices, and projections','Loss functions and gradient descent','Bias, variance, overfitting, and underfitting']},
  {t:'Core Machine Learning', n:['Linear regression and least squares','Model evaluation: splits, cross-validation, and leakage','Classification metrics: precision, recall, and ROC-AUC','Logistic regression','Regularization: L1, L2, and early stopping','k-nearest neighbors and the curse of dimensionality','Support vector machines and kernels','Decision trees','Random forests and bagging','Gradient boosting','Naive Bayes','Clustering: k-means and DBSCAN','Dimensionality reduction: PCA','Feature engineering']},
  {t:'Deep Learning', n:['Neural networks and the multilayer perceptron','Backpropagation and the chain rule','Optimizers: SGD, momentum, and Adam','Activation functions and initialization','Normalization and dropout','Convolutional networks','Recurrent networks and their limits','Embeddings: meaning as geometry','Attention and the transformer','Transfer learning and fine-tuning','Autoencoders and VAEs','GANs','Diffusion models','Reinforcement learning: MDPs, Q-learning, and policy gradients']},
  {t:'Large Language Models', n:['Tokenization','Modern LLM architecture: decoder-only, RoPE, KV cache, and mixture of experts','Pretraining and scaling laws','Post-training: SFT, RLHF, and constitutional methods','Inference: sampling, temperature, and context windows','Interpretability']},
  {t:'Building with AI', n:['Prompting properly: few-shot, reasoning, and structured output','Retrieval-augmented generation','Agents and tool use','Fine-tuning vs. RAG vs. prompting: a decision framework with cost math','Production AI: rate limits, caching, and fallbacks','Evaluating LLMs: benchmarks, LLM-as-judge, and hallucination measurement','AI security: prompt injection, data poisoning, and model extraction']},
  {t:'Society and the Frontier', n:['AI safety and alignment: reward hacking and specification gaming','AI policy and regulation','Bias and fairness in machine learning','The economics of AI','The frontier: multimodality, world models, and AGI debates']}]},
 {id:'py', name:'Python', mono:'Py', color:'#E0B75C', program:true, code:'python', blurb:'From first program to professional Python, with security and systems tooling. Code runs and is tested in the app.', units:[
  {t:'Basics', n:['Setup, the interpreter, and your first program','Variables and types','Operators and expressions','Strings, slicing, and f-strings','Conditionals and truthiness','Loops: for, while, and range','Lists and tuples','Dictionaries and sets','Functions: parameters, return values, and scope','Reading tracebacks and debugging']},
  {t:'Real Programming', n:['Choosing data structures and basic Big-O','Recursion','Comprehensions','Iterators and generators','Errors and exceptions','Files, CSV, and JSON','Context managers','Modules, packages, pip, and virtual environments','Git for your projects','Regular expressions','Command-line tools with argparse','Writing your first tests']},
  {t:'Objects and Functions', n:['Classes, instances, and __init__','Inheritance and composition','Dunder methods and the data model','Dataclasses','Closures and decorators','The standard library: collections, itertools, pathlib, and datetime','Logging']},
  {t:'Professional Python', n:['Testing with pytest and mocking','Type hints and mypy','Working with HTTP APIs','SQL and SQLite from Python','Concurrency: threads, processes, and the GIL','asyncio','Building a REST API with FastAPI','Packaging and project structure']},
  {t:'Data', n:['NumPy and vectorization','pandas: DataFrames, cleaning, and joins','Visualization with Matplotlib']},
  {t:'Security and Systems', n:['subprocess and automating the shell','Sockets and network programming','Parsing binary data with struct','Packet crafting with Scapy','Writing a port scanner','Log parsing and automation','Secure Python: injection, pickle, and secrets']},
  {t:'Advanced', n:['How CPython executes code','Memory, mutability, and references','Profiling and performance','Metaprogramming and metaclasses','Design patterns in Python']}]},
 {id:'cert', name:'Network+ & Security+', mono:'N+', color:'#5FC7A8', program:true, cert:true, blurb:'CompTIA Network+ (N10-009) then Security+ (SY0-701), objective by objective, with scenario problems, drills, and labs.', units:[
  {t:'Network+ 1.0 · Networking Concepts', exam:'N10-009', w:23, n:['1.1 The OSI reference model','1.2 Networking appliances, applications, and functions','1.3 Cloud concepts and connectivity options','1.4 Ports, protocols, services, and traffic types','1.5 Transmission media and transceivers','1.6 Topologies, architectures, and network types','1.7 IPv4 addressing and subnetting','1.8 Modern network environments: SDN, SD-WAN, zero trust, and IPv6'],
   o:['Explain concepts related to the Open Systems Interconnection (OSI) reference model.','Compare and contrast networking appliances, applications, and functions.','Summarize cloud concepts and connectivity options.','Explain common networking ports, protocols, services, and traffic types.','Compare and contrast transmission media and transceivers.','Compare and contrast network topologies, architectures, and types.','Given a scenario, use appropriate IPv4 network addressing.','Summarize evolving use cases for modern network environments.']},
  {t:'Network+ 2.0 · Network Implementation', exam:'N10-009', w:20, n:['2.1 Routing technologies','2.2 Switching technologies and VLANs','2.3 Wireless devices and technologies','2.4 Physical installations'],
   o:['Explain characteristics of routing technologies.','Given a scenario, configure switching technologies and features.','Given a scenario, select and configure wireless devices and technologies.','Explain important factors of physical installations.']},
  {t:'Network+ 3.0 · Network Operations', exam:'N10-009', w:19, n:['3.1 Organizational processes and procedures','3.2 Network monitoring technologies','3.3 Disaster recovery','3.4 IPv4 and IPv6 network services: DHCP, DNS, and NTP','3.5 Network access and management methods'],
   o:['Explain the purpose of organizational processes and procedures.','Given a scenario, use network monitoring technologies.','Explain disaster recovery (DR) concepts.','Given a scenario, implement IPv4 and IPv6 network services.','Compare and contrast network access and management methods.']},
  {t:'Network+ 4.0 · Network Security', exam:'N10-009', w:14, n:['4.1 Basic network security concepts','4.2 Attacks and their impact on the network','4.3 Network security features, defenses, and solutions'],
   o:['Explain the importance of basic network security concepts.','Summarize various types of attacks and their impact to the network.','Given a scenario, apply network security features, defense techniques, and solutions.']},
  {t:'Network+ 5.0 · Network Troubleshooting', exam:'N10-009', w:24, n:['5.1 The troubleshooting methodology','5.2 Cabling and physical interface issues','5.3 Network service issues','5.4 Performance issues','5.5 Tools and protocols for troubleshooting'],
   o:['Explain the troubleshooting methodology.','Given a scenario, troubleshoot common cabling and physical interface issues.','Given a scenario, troubleshoot common issues with network services.','Given a scenario, troubleshoot common performance issues.','Given a scenario, use the appropriate tool or protocol to solve networking issues.']},
  {t:'Security+ 1.0 · General Security Concepts', exam:'SY0-701', w:12, n:['1.1 Security controls','1.2 Fundamental security concepts','1.3 Change management','1.4 Cryptographic solutions'],
   o:['Compare and contrast various types of security controls.','Summarize fundamental security concepts.','Explain the importance of change management processes and the impact to security.','Explain the importance of using appropriate cryptographic solutions.']},
  {t:'Security+ 2.0 · Threats, Vulnerabilities, and Mitigations', exam:'SY0-701', w:22, n:['2.1 Threat actors and motivations','2.2 Threat vectors and attack surfaces','2.3 Types of vulnerabilities','2.4 Indicators of malicious activity','2.5 Mitigation techniques'],
   o:['Compare and contrast common threat actors and motivations.','Explain common threat vectors and attack surfaces.','Explain various types of vulnerabilities.','Given a scenario, analyze indicators of malicious activity.','Explain the purpose of mitigation techniques used to secure the enterprise.']},
  {t:'Security+ 3.0 · Security Architecture', exam:'SY0-701', w:18, n:['3.1 Architecture models','3.2 Securing enterprise infrastructure','3.3 Protecting data','3.4 Resilience and recovery'],
   o:['Compare and contrast security implications of different architecture models.','Given a scenario, apply security principles to secure enterprise infrastructure.','Compare and contrast concepts and strategies to protect data.','Explain the importance of resilience and recovery in security architecture.']},
  {t:'Security+ 4.0 · Security Operations', exam:'SY0-701', w:28, n:['4.1 Securing computing resources','4.2 Hardware, software, and data asset management','4.3 Vulnerability management','4.4 Alerting and monitoring','4.5 Enhancing enterprise security capabilities','4.6 Identity and access management','4.7 Automation and orchestration','4.8 Incident response','4.9 Data sources for investigations'],
   o:['Given a scenario, apply common security techniques to computing resources.','Explain the security implications of proper hardware, software, and data asset management.','Explain various activities associated with vulnerability management.','Explain security alerting and monitoring concepts and tools.','Given a scenario, modify enterprise capabilities to enhance security.','Given a scenario, implement and maintain identity and access management.','Explain the importance of automation and orchestration related to secure operations.','Explain appropriate incident response activities.','Given a scenario, use data sources to support an investigation.']},
  {t:'Security+ 5.0 · Program Management and Oversight', exam:'SY0-701', w:20, n:['5.1 Security governance','5.2 Risk management','5.3 Third-party risk assessment and management','5.4 Security compliance','5.5 Audits and assessments','5.6 Security awareness practices'],
   o:['Summarize elements of effective security governance.','Explain elements of the risk management process.','Explain the processes associated with third-party risk assessment and management.','Summarize elements of effective security compliance.','Explain types and purposes of audits and assessments.','Given a scenario, implement security awareness practices.']}]}
);

/* reference syllabi: outlines are anchored to these so scope and depth match real courses, not a title's vibe */
const SYLLABI = {
  mth:['College algebra and precalculus (Stewart, Precalculus)', 'AP Calculus AB/BC course framework; Stewart, Calculus', 'AP Calculus BC; Stewart, Calculus', 'Stewart, Multivariable Calculus; MIT 18.02', 'Lay, Linear Algebra and Its Applications; Strang, MIT 18.06', 'Boyce and DiPrima, Elementary Differential Equations', 'Velleman, How to Prove It; Rosen, Discrete Mathematics', 'Standard undergraduate introductions (Abbott, Understanding Analysis; Pinter, A Book of Abstract Algebra)'],
  sts:'AP Statistics course framework; OpenIntro Statistics; Blitzstein and Hwang, Introduction to Probability',
  phy:'AP Physics C and University Physics (Young and Freedman); Griffiths for quantum topics',
  chm:'AP Chemistry course framework; Zumdahl, Chemistry; Klein, Organic Chemistry',
  ai:'Stanford CS229 and CS231n syllabi; Goodfellow et al., Deep Learning; Bishop, Pattern Recognition and Machine Learning; current LLM literature',
  py:'Python official tutorial and docs; Ramalho, Fluent Python; Slatkin, Effective Python',
  cert:'Official CompTIA exam objectives: Network+ N10-009 and Security+ SY0-701 (each topic is one objective; cover every listed sub-bullet)',
  cyber:'NIST SP 800-series and the NICE framework; OWASP; MITRE ATT&CK; Anderson, Security Engineering',
  cs:'ACM/IEEE Computer Science Curricula; CLRS, Introduction to Algorithms; Bryant and O’Hallaron, Computer Systems; Sipser, Theory of Computation',
  econ:'Mankiw and Krugman principles texts; Mishkin, Money and Banking; Bodie, Kane, and Marcus for investing; primary research for debates',
  epi:'Pearl, The Book of Why; Tetlock, Superforecasting; Kahneman; standard research-methods courses',
  phil:'Stanford Encyclopedia of Philosophy entries and the primary texts they cite',
  hist:'University survey courses and the major historiographical debates on each topic',
  geo:'International-relations theory (Waltz, Mearsheimer, Keohane, Wendt) and current primary reporting',
  bio:'Campbell Biology; Alberts, Molecular Biology of the Cell',
  viro:'Flint et al., Principles of Virology; Janeway’s Immunobiology; epidemiology coursework',
  neuro:'Kandel, Principles of Neural Science; Gazzaniga, Cognitive Neuroscience',
  astro:'Carroll and Ostlie, Introduction to Modern Astrophysics; current survey results',
  rel:'University comparative-religion courses and the traditions’ primary texts',
  de:'CEFR can-do descriptors, Goethe-Zertifikat levels A1–B1',
  ca:'CEFR can-do descriptors; Catalan certificates A1–B1 (Consorci per a la Normalització Lingüística / Institut Ramon Llull)',
  elx:'Horowitz and Hill, The Art of Electronics (intro chapters); Scherz and Monk, Practical Electronics for Inventors',
  rob:'Arduino documentation; introductory robotics courses (Lynch and Park, Modern Robotics, for later topics)',
  mak:'Standard trade and DIY references; manufacturer safety guidance'
};
function syllabusFor(info) {
  const r = SYLLABI[info.sid];
  if (Array.isArray(r)) return r[info.ui] || r[r.length - 1];
  if (r) return r;
  return info.subject.custom ? 'a strong university course on this subject' : 'standard university coursework';
}
function objectiveFor(info) { const u = info.subject.units[info.ui]; return u && u.o ? u.o[info.ni] : null; }

/* hands-on practice outside the app: free labs and simulators */
const LABS = {
  cert:[{label:'Professor Messer (free N10-009 and SY0-701 courses)', url:'https://www.professormesser.com/'}, {label:'Cisco Packet Tracer', url:'https://www.netacad.com/cisco-packet-tracer'}, {label:'TryHackMe', url:'https://tryhackme.com/'}],
  cyber:[{label:'OverTheWire Bandit', url:'https://overthewire.org/wargames/bandit/'}, {label:'PortSwigger Web Security Academy', url:'https://portswigger.net/web-security'}, {label:'TryHackMe', url:'https://tryhackme.com/'}],
  elx:[{label:'Falstad circuit simulator', url:'https://www.falstad.com/circuit/'}, {label:'Tinkercad Circuits', url:'https://www.tinkercad.com/circuits'}],
  rob:[{label:'Wokwi Arduino simulator', url:'https://wokwi.com/'}, {label:'Tinkercad Circuits', url:'https://www.tinkercad.com/circuits'}],
  ai:[{label:'Google Colab', url:'https://colab.research.google.com/'}, {label:'Kaggle datasets', url:'https://www.kaggle.com/datasets'}],
  py:[{label:'Python documentation', url:'https://docs.python.org/3/'}]
};
