// docs/.vitepress/theme/index.js
import DefaultTheme from 'vitepress/theme'
import './custom.css'

import EventCard from './components/EventCard.vue'
import EventFilter from './components/EventFilter.vue'
import EventStatusBadge from "./components/EventStatusBadge.vue";
import PagefindSearch from './components/PagefindSearch.vue'

export default {
    ...DefaultTheme,
    enhanceApp({ app }) {
        app.component('EventCard', EventCard)
        app.component('EventFilter', EventFilter)
        app.component("EventStatusBadge", EventStatusBadge);
        app.component('PagefindSearch', PagefindSearch)
    },
}