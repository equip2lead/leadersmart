// Simple i18n dictionary helper
// For v1 we keep it simple. Full i18next can come later.

import type { AppLanguage } from './types';

type Dictionary = Record<string, string>;

const en: Dictionary = {
  // Landing
  'landing.hero.badge': 'Pastor of the Month Program',
  'landing.hero.title': 'Lead Every Team. Develop Every Pastor.',
  'landing.hero.subtitle':
    'The platform African churches use to run Sunday operations, schedule volunteers on WhatsApp, check in kids safely, and turn pastoral excellence into a measurable discipline.',
  'landing.hero.cta': 'Start Free',
  'landing.hero.demo': 'View Demo',

  'landing.features.title': 'Everything You Need to Run a Ministry Team',
  'landing.features.subtitle':
    'Five integrated modules designed for the African church reality — WhatsApp-first, bilingual, offline-tolerant.',

  'landing.feature.pastor.title': 'Pastor of the Month',
  'landing.feature.pastor.desc':
    'Sunday checklists, 5-week execution plans, end-of-month reports, structured evaluations.',

  'landing.feature.dept.title': 'Department Leaders',
  'landing.feature.dept.desc':
    'Team rosters, weekly schedules, WhatsApp broadcasts, one-tap attendance, weekly reports.',

  'landing.feature.kids.title': 'Kids Check-In',
  'landing.feature.kids.desc':
    'Safety labels with pickup codes, allergy tracking, parent WhatsApp confirmations. Three print options.',

  'landing.feature.whatsapp.title': 'WhatsApp Engine',
  'landing.feature.whatsapp.desc':
    'Every schedule, reminder, and check-in flows through WhatsApp — where your team already lives.',

  'landing.feature.dashboard.title': 'Leadership Dashboard',
  'landing.feature.dashboard.desc':
    'Senior pastors see every department at a glance. Early warnings. Evaluation trends. One screen.',

  'landing.cta.title': 'Ready to Transform Your Ministry Operations?',
  'landing.cta.subtitle': 'Free for churches under 50 members. No setup fees. Get started in under 10 minutes.',
  'landing.cta.button': 'Start Your Journey',

  // Auth
  'auth.login.title': 'Welcome Back',
  'auth.login.subtitle': 'Sign in to LeaderSmart',
  'auth.login.email': 'Email address',
  'auth.login.password': 'Password',
  'auth.login.remember': 'Remember me',
  'auth.login.forgot': 'Forgot password?',
  'auth.login.button': 'Sign in',
  'auth.login.google': 'Continue with Google',
  'auth.login.or': 'or',
  'auth.login.noAccount': "Don't have an account?",
  'auth.login.signupLink': 'Sign up',

  'auth.signup.title': 'Create Your Church Account',
  'auth.signup.subtitle': 'Get started in under 2 minutes',
  'auth.signup.churchName': 'Church name',
  'auth.signup.yourName': 'Your full name',
  'auth.signup.email': 'Email address',
  'auth.signup.password': 'Create a password',
  'auth.signup.language': 'Preferred language',
  'auth.signup.button': 'Create account',
  'auth.signup.hasAccount': 'Already have an account?',
  'auth.signup.loginLink': 'Sign in',
  'auth.checkEmail': 'Check your email — we sent a confirmation link to finish setup.',
  'auth.error.generic': 'Something went wrong. Please try again.',

  // Dashboard common
  'nav.dashboard': 'Dashboard',
  'nav.sunday': 'Sunday Checklist',
  'nav.plan': 'Weekly Plan',
  'nav.report': 'Monthly Report',
  'nav.evaluations': 'My Evaluations',
  'nav.departments': 'Departments',
  'nav.team': 'Team Members',
  'nav.schedules': 'Schedules',
  'nav.kids': 'Kids Check-In',
  'nav.settings': 'Settings',
  'nav.signout': 'Sign out',

  'common.loading': 'Loading…',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.welcome': 'Welcome',
  'common.add': 'Add',
  'common.none': 'None yet',
  'common.submit': 'Submit',
  'common.back': 'Back',
  'common.empty': 'Nothing here yet.',
  'common.draft': 'Draft',
  'common.submitted': 'Submitted',
  'common.pending': 'Pending',
  'common.comingSoon': 'Coming soon',

  'nav.pastors': 'Pastor Assignments',
  'nav.users': 'Team Users',
  'nav.attendance': 'Attendance',
  'nav.weeklyReport': 'Weekly Report',
  'nav.kiosk': 'Kids Kiosk',

  // Admin dashboard
  'admin.title': 'Church Dashboard',
  'admin.stat.attendance': 'Last Sunday',
  'admin.stat.offering': 'Offering',
  'admin.stat.visitors': 'New Visitors',
  'admin.stat.currentPastor': 'Pastor of the Month',
  'admin.stat.daysToHandover': 'Days to Handover',
  'admin.departments.title': 'Department Status',
  'admin.trend.title': 'Pastor Performance Trend',
  'admin.alerts.title': 'Alerts',
  'admin.alerts.none': 'All clear — no outstanding alerts.',
  'admin.pastors.title': 'Pastor Assignments',
  'admin.users.title': 'Team Users',
  'admin.departments.page': 'Departments',

  // Pastor dashboard
  'pastor.welcomeBack': 'Welcome back',
  'pastor.potm': 'Pastor of the Month',
  'pastor.card.currentWeek': 'Current Week',
  'pastor.card.tasksCompleted': 'Tasks Completed',
  'pastor.card.checklists': 'Sunday Checklists',
  'pastor.card.avgRating': 'Average Rating',
  'pastor.card.pendingEval': 'Pending evaluation',
  'pastor.quickActions': 'Quick Actions',
  'pastor.qa.checklist': 'Complete Sunday Checklist',
  'pastor.qa.postservice': 'Post-Service Report',
  'pastor.qa.plan': 'Weekly Plan',
  'pastor.thisWeek': 'This Week\'s Tasks',
  'pastor.monthProgress': 'Month Progress',
  'pastor.evalAreas': 'Evaluation Areas',
  'pastor.evalPendingMsg': 'Your evaluation is in progress.',
  'pastor.notAssigned': 'You are not the current Pastor of the Month.',
  'pastor.sunday.title': 'Sunday Checklist',
  'pastor.plan.title': 'Weekly Execution Plan',
  'pastor.report.title': 'End-of-Month Report',
  'pastor.eval.title': 'My Evaluations',

  // Leader dashboard
  'leader.title': 'Department Dashboard',
  'leader.stat.team': 'Team Size',
  'leader.stat.upcoming': 'Upcoming Service',
  'leader.stat.attendance': 'Last Attendance',
  'leader.team.title': 'Team Roster',
  'leader.schedules.title': 'Schedules',
  'leader.attendance.title': 'Attendance',
  'leader.report.title': 'Weekly Report',
  'leader.noDept': 'You are not assigned to a department yet.',
};

const fr: Dictionary = {
  // Landing
  'landing.hero.badge': 'Programme Pasteur du Mois',
  'landing.hero.title': 'Dirigez Chaque Équipe. Développez Chaque Pasteur.',
  'landing.hero.subtitle':
    'La plateforme utilisée par les églises africaines pour gérer les opérations dominicales, planifier les bénévoles via WhatsApp, accueillir les enfants en toute sécurité et faire de l\'excellence pastorale une discipline mesurable.',
  'landing.hero.cta': 'Commencer Gratuitement',
  'landing.hero.demo': 'Voir la Démo',

  'landing.features.title': 'Tout ce qu\'il Faut pour Diriger une Équipe Ministérielle',
  'landing.features.subtitle':
    'Cinq modules intégrés conçus pour la réalité de l\'église africaine — WhatsApp d\'abord, bilingue, tolérant hors ligne.',

  'landing.feature.pastor.title': 'Pasteur du Mois',
  'landing.feature.pastor.desc':
    'Listes du dimanche, plans d\'exécution sur 5 semaines, rapports de fin de mois, évaluations structurées.',

  'landing.feature.dept.title': 'Chefs de Département',
  'landing.feature.dept.desc':
    'Listes d\'équipe, plannings hebdomadaires, diffusions WhatsApp, présence en un clic, rapports hebdomadaires.',

  'landing.feature.kids.title': 'Enregistrement des Enfants',
  'landing.feature.kids.desc':
    'Étiquettes de sécurité avec codes de retrait, suivi des allergies, confirmations WhatsApp aux parents. Trois options d\'impression.',

  'landing.feature.whatsapp.title': 'Moteur WhatsApp',
  'landing.feature.whatsapp.desc':
    'Chaque planning, rappel et enregistrement passe par WhatsApp — là où votre équipe vit déjà.',

  'landing.feature.dashboard.title': 'Tableau de Bord Leadership',
  'landing.feature.dashboard.desc':
    'Les pasteurs principaux voient chaque département d\'un coup d\'œil. Alertes précoces. Tendances d\'évaluation. Un seul écran.',

  'landing.cta.title': 'Prêt à Transformer Vos Opérations Ministérielles ?',
  'landing.cta.subtitle':
    'Gratuit pour les églises de moins de 50 membres. Pas de frais d\'installation. Démarrez en moins de 10 minutes.',
  'landing.cta.button': 'Commencer',

  // Auth
  'auth.login.title': 'Bon Retour',
  'auth.login.subtitle': 'Connectez-vous à LeaderSmart',
  'auth.login.email': 'Adresse e-mail',
  'auth.login.password': 'Mot de passe',
  'auth.login.remember': 'Se souvenir de moi',
  'auth.login.forgot': 'Mot de passe oublié ?',
  'auth.login.button': 'Se connecter',
  'auth.login.google': 'Continuer avec Google',
  'auth.login.or': 'ou',
  'auth.login.noAccount': 'Vous n\'avez pas de compte ?',
  'auth.login.signupLink': 'S\'inscrire',

  'auth.signup.title': 'Créez le Compte de Votre Église',
  'auth.signup.subtitle': 'Démarrez en moins de 2 minutes',
  'auth.signup.churchName': 'Nom de l\'église',
  'auth.signup.yourName': 'Votre nom complet',
  'auth.signup.email': 'Adresse e-mail',
  'auth.signup.password': 'Créez un mot de passe',
  'auth.signup.language': 'Langue préférée',
  'auth.signup.button': 'Créer le compte',
  'auth.signup.hasAccount': 'Vous avez déjà un compte ?',
  'auth.signup.loginLink': 'Se connecter',
  'auth.checkEmail': 'Vérifiez votre e-mail — nous vous avons envoyé un lien de confirmation pour finaliser votre compte.',
  'auth.error.generic': 'Une erreur est survenue. Veuillez réessayer.',

  // Dashboard common
  'nav.dashboard': 'Tableau de bord',
  'nav.sunday': 'Liste du Dimanche',
  'nav.plan': 'Plan Hebdomadaire',
  'nav.report': 'Rapport Mensuel',
  'nav.evaluations': 'Mes Évaluations',
  'nav.departments': 'Départements',
  'nav.team': 'Membres d\'Équipe',
  'nav.schedules': 'Plannings',
  'nav.kids': 'Enregistrement Enfants',
  'nav.settings': 'Paramètres',
  'nav.signout': 'Déconnexion',

  'common.loading': 'Chargement…',
  'common.save': 'Enregistrer',
  'common.cancel': 'Annuler',
  'common.confirm': 'Confirmer',
  'common.delete': 'Supprimer',
  'common.edit': 'Modifier',
  'common.welcome': 'Bienvenue',
  'common.add': 'Ajouter',
  'common.none': 'Aucun pour le moment',
  'common.submit': 'Soumettre',
  'common.back': 'Retour',
  'common.empty': 'Rien pour le moment.',
  'common.draft': 'Brouillon',
  'common.submitted': 'Soumis',
  'common.pending': 'En attente',
  'common.comingSoon': 'Bientôt disponible',

  'nav.pastors': 'Assignations Pastorales',
  'nav.users': 'Utilisateurs',
  'nav.attendance': 'Présence',
  'nav.weeklyReport': 'Rapport Hebdomadaire',
  'nav.kiosk': 'Kiosque Enfants',

  // Admin dashboard
  'admin.title': 'Tableau de Bord',
  'admin.stat.attendance': 'Dimanche Dernier',
  'admin.stat.offering': 'Offrande',
  'admin.stat.visitors': 'Nouveaux Visiteurs',
  'admin.stat.currentPastor': 'Pasteur du Mois',
  'admin.stat.daysToHandover': 'Jours Avant Passation',
  'admin.departments.title': 'État des Départements',
  'admin.trend.title': 'Tendance des Évaluations',
  'admin.alerts.title': 'Alertes',
  'admin.alerts.none': 'Tout va bien — aucune alerte en cours.',
  'admin.pastors.title': 'Assignations Pastorales',
  'admin.users.title': 'Utilisateurs de l\'Équipe',
  'admin.departments.page': 'Départements',

  // Pastor dashboard
  'pastor.welcomeBack': 'Bon retour',
  'pastor.potm': 'Pasteur du Mois',
  'pastor.card.currentWeek': 'Semaine en Cours',
  'pastor.card.tasksCompleted': 'Tâches Terminées',
  'pastor.card.checklists': 'Listes du Dimanche',
  'pastor.card.avgRating': 'Note Moyenne',
  'pastor.card.pendingEval': 'Évaluation en attente',
  'pastor.quickActions': 'Actions Rapides',
  'pastor.qa.checklist': 'Compléter la Liste du Dimanche',
  'pastor.qa.postservice': 'Rapport Post-Service',
  'pastor.qa.plan': 'Plan Hebdomadaire',
  'pastor.thisWeek': 'Tâches de la Semaine',
  'pastor.monthProgress': 'Progression du Mois',
  'pastor.evalAreas': 'Domaines d\'Évaluation',
  'pastor.evalPendingMsg': 'Votre évaluation est en cours.',
  'pastor.notAssigned': 'Vous n\'êtes pas Pasteur du Mois actuellement.',
  'pastor.sunday.title': 'Liste du Dimanche',
  'pastor.plan.title': 'Plan d\'Exécution Hebdomadaire',
  'pastor.report.title': 'Rapport de Fin de Mois',
  'pastor.eval.title': 'Mes Évaluations',

  // Leader dashboard
  'leader.title': 'Tableau de Bord — Département',
  'leader.stat.team': 'Taille de l\'Équipe',
  'leader.stat.upcoming': 'Prochain Service',
  'leader.stat.attendance': 'Dernière Présence',
  'leader.team.title': 'Liste de l\'Équipe',
  'leader.schedules.title': 'Plannings',
  'leader.attendance.title': 'Présence',
  'leader.report.title': 'Rapport Hebdomadaire',
  'leader.noDept': 'Vous n\'êtes pas encore assigné à un département.',
};

const dictionaries: Record<AppLanguage, Dictionary> = { en, fr };

export function t(key: string, lang: AppLanguage = 'en'): string {
  return dictionaries[lang][key] ?? dictionaries.en[key] ?? key;
}

export function getDict(lang: AppLanguage = 'en'): Dictionary {
  return dictionaries[lang];
}
