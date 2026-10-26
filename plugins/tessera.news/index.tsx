import { definePlugin } from '@tessera/plugin-sdk'
import { NewsWidget } from './NewsWidget'

export default definePlugin({
  widgets: {
    news: NewsWidget
  },
  translations: {
    fr: {
      feed: 'Flux affiché',
      feeds: 'Flux suivis',
      all: 'Tous les articles',
      allFeeds: 'Tous ({{count}} non lus)',
      search: 'Rechercher dans les articles…',
      unreadOnly: 'Non lus seulement',
      markAllRead: 'Tout marquer comme lu',
      refresh: 'Actualiser maintenant',
      addFeed: 'Suivre un site ou un flux',
      feedAddress: 'Adresse du site ou du flux RSS (ex. lemonde.fr)',
      follow: 'Suivre',
      loading: 'Chargement…',
      noFeeds: 'Ajoute un site avec le bouton + : son flux RSS est trouvé tout seul.',
      noItems: 'Aucun article.',
      allRead: 'Tout est lu.',
      notifyOn: 'Me notifier des nouveaux articles',
      notifyOff: 'Ne plus me notifier',
      openSite: 'Ouvrir le site',
      unfollow: 'Ne plus suivre',
      unfollowTitle: 'Ne plus suivre ce flux ?',
      unfollowMessage: 'Les articles de « {{title}} » disparaîtront de la liste.',
      cancel: 'Annuler',
      markRead: 'Marquer comme lu',
      markUnread: 'Marquer comme non lu',
      feedsHint: 'Clic droit sur un flux : notifications, ne plus suivre.'
    },
    en: {
      feed: 'Shown feed',
      feeds: 'Followed feeds',
      all: 'All articles',
      allFeeds: 'All ({{count}} unread)',
      search: 'Search articles…',
      unreadOnly: 'Unread only',
      markAllRead: 'Mark all as read',
      refresh: 'Refresh now',
      addFeed: 'Follow a site or feed',
      feedAddress: 'Site or RSS feed address (e.g. theverge.com)',
      follow: 'Follow',
      loading: 'Loading…',
      noFeeds: 'Add a site with the + button: its RSS feed is found automatically.',
      noItems: 'No articles.',
      allRead: 'All caught up.',
      notifyOn: 'Notify me of new articles',
      notifyOff: 'Stop notifying me',
      openSite: 'Open the site',
      unfollow: 'Unfollow',
      unfollowTitle: 'Unfollow this feed?',
      unfollowMessage: 'The articles from “{{title}}” will disappear from the list.',
      cancel: 'Cancel',
      markRead: 'Mark as read',
      markUnread: 'Mark as unread',
      feedsHint: 'Right-click a feed: notifications, unfollow.'
    }
  }
})
