import type { Component } from 'vue'
import type { HomepageModuleComponentKey } from '../../types/homepage'
import HomepageFooter1 from './modules/HomepageFooter1.vue'
import HomepageHero3 from './modules/HomepageHero3.vue'
import HomepageImageSlider1 from './modules/HomepageImageSlider1.vue'
import HomepageNav1 from './modules/HomepageNav1.vue'
import HomepageProductSlider1 from './modules/HomepageProductSlider1.vue'
import HomepageCategoryGrid1 from './modules/HomepageCategoryGrid1.vue'

export const homepageModuleRegistry: Record<HomepageModuleComponentKey, Component> = {
  nav1: HomepageNav1,
  hero3: HomepageHero3,
  image_slider1: HomepageImageSlider1,
  category_grid1: HomepageCategoryGrid1,
  product_slider1: HomepageProductSlider1,
  footer1: HomepageFooter1,
}
