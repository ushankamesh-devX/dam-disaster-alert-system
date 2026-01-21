// app/(tabs)/news.tsx
import React, { useState } from 'react';
import { ScrollView, View, RefreshControl } from 'react-native';
import { ScreenLayout } from '@/components/ScreenLayout';
import { NewsCard } from '@/components/pages/News/NewsCard';
import { NewsFilterTabs } from '@/components/pages/News/NewsFilterTabs';
import { NewsDetailModal } from '@/components/pages/News/NewsDetailModal';

// Realistic news data with weather, safety alerts, and community welfare
const newsData = [
  {
    id: '1',
    image: 'data:image/webp;base64,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',
    category: 'Weather Alert',
    title: 'Heavy Rainfall Warning for Western Province',
    description: 'Meteorology Department issues heavy rainfall warning for Western Province including Colombo, Gampaha, and Kalutara districts. Expected rainfall: 150-200mm over next 48 hours.',
    fullContent: 'The Department of Meteorology has issued a Level 2 (Orange) weather warning for the Western Province. Heavy rainfall between 150-200mm is expected over the next 48 hours due to the low-pressure system developing in the Bay of Bengal. Residents in low-lying areas are advised to be vigilant about potential flooding. The Kelani River water levels are being closely monitored. Fishermen are advised not to venture into the sea during this period. Emergency services are on high alert. Please stay indoors during heavy downpours and avoid unnecessary travel. Keep emergency contact numbers handy and follow official weather updates.',
    timeAgo: '30 minutes ago',
    filter: 'weather-alerts'
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1601134467661-3d775b999c8b?w=800&q=80',
    category: 'Landslide Warning',
    title: 'Landslide Risk High in Central Highlands',
    description: 'National Building Research Organisation warns of high landslide risk in Nuwara Eliya, Badulla, and Kandy districts following continuous rainfall.',
    fullContent: 'The National Building Research Organisation (NBRO) has issued a red alert for landslide-prone areas in the Central Highlands. Districts including Nuwara Eliya, Badulla, Kandy, Ratnapura, and Kegalle are at high risk. Over 150 families in vulnerable areas have been relocated to temporary shelters. The Disaster Management Centre has activated emergency response teams in these regions. Residents are urged to watch for warning signs including cracks in walls, tilting trees, sudden changes in water levels in wells, and unusual sounds from slopes. Evacuation routes have been clearly marked. Emergency hotline 117 is operational 24/7. Local authorities are conducting regular inspections of high-risk zones.',
    timeAgo: '2 hours ago',
    filter: 'emergency'
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1603739903239-8b6e64c3b185?w=800&q=80',
    category: 'Dam Status',
    title: 'Victoria Dam Water Level Approaching Spill Level',
    description: 'Mahaweli Authority announces Victoria Dam water level at 95% capacity. Controlled water release planned to manage reservoir levels safely.',
    fullContent: 'The Mahaweli Authority of Sri Lanka reports that Victoria Dam has reached 95% of its storage capacity due to heavy rainfall in the catchment area. A controlled water release of 3,000 cubic feet per second is planned starting tomorrow at 6:00 AM. Communities downstream along the Mahaweli River including Teldeniya, Kundasale, and Gampola are advised to take necessary precautions. The Irrigation Department will coordinate with local authorities to ensure public safety. Farmers should secure their crops and livestock in low-lying areas. The water release will continue for 72 hours depending on rainfall patterns. Real-time water level data is available on the Mahaweli Authority website. Emergency response teams are stationed at strategic locations.',
    timeAgo: '3 hours ago',
    filter: 'dam-status'
  },
  {
    id: '4',
    image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80',
    category: 'Weather Update',
    title: 'Sunny Weather Expected for Northern Province',
    description: 'Clear skies and sunny conditions forecasted for Jaffna, Kilinochchi, Mannar, and Vavuniya districts for the next 5 days. Temperatures between 28-32°C.',
    fullContent: 'The Northern Province can expect pleasant weather conditions over the next five days. The Department of Meteorology forecasts clear skies with plenty of sunshine. Day temperatures will range between 28-32°C with night temperatures around 24-26°C. Light winds from the northeast will provide comfortable conditions. This is an excellent period for agricultural activities, particularly harvesting. Fishermen can safely venture into the sea with calm conditions expected. However, residents are advised to stay hydrated and use sun protection during peak afternoon hours (12 PM - 3 PM). The favorable weather is expected to boost tourism activities in the region. No significant rainfall expected during this period.',
    timeAgo: '5 hours ago',
    filter: 'weather-alerts'
  },
  {
    id: '5',
    image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80',
    category: 'Lightning Warning',
    title: 'Thunderstorm and Lightning Alert for Multiple Districts',
    description: 'Severe thunderstorms with lightning expected in Sabaragamuwa, Central, and Uva provinces during evening hours. Public advised to stay indoors.',
    fullContent: 'The Meteorology Department has issued a thunderstorm warning for Sabaragamuwa, Central, and Uva provinces. Severe thunderstorms accompanied by heavy lightning are expected between 2 PM and 8 PM today. Wind speeds may reach up to 60-70 kmph during thunderstorms. Residents are strongly advised to stay indoors and avoid open areas, tall trees, and metal structures. Unplug electrical appliances during lightning activity. Farmers should secure livestock and move them to sheltered areas. Schools in affected districts may consider early dismissal. The Sri Lanka Electricity Board has mobilized emergency repair crews. Vehicle drivers should exercise extreme caution and avoid parking under trees. Emergency services have been placed on standby. Follow official updates and heed warnings from local authorities.',
    timeAgo: '1 hour ago',
    filter: 'emergency'
  },
  {
    id: '6',
    image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&q=80',
    category: 'Community Support',
    title: 'Flood Relief Donation Drive for Affected Families',
    description: 'National Disaster Relief Fund launches donation campaign for 5,000 families affected by recent floods in Southern Province. Multiple collection centers operational.',
    fullContent: 'The National Disaster Relief Services has launched a comprehensive donation drive to support over 5,000 families affected by the recent flooding in the Southern Province. Collection centers are now operational in Colombo, Galle, Matara, and Hambantota. Urgently needed items include: dry food packets (rice, dhal, canned goods), bottled water, new clothing (all sizes), blankets, mosquito nets, sanitary items, baby supplies, and basic medicines. Monetary donations can be made to Bank of Ceylon Account No: 0012345678 (Name: National Disaster Relief Fund). All donations are tax-deductible. Volunteer teams are being organized for distribution activities. The government has allocated Rs. 50 million in immediate relief. Several NGOs and corporate organizations have joined the effort. Temporary shelters have been established in 15 locations housing 2,000 people. Medical teams are providing healthcare services. Updates on distribution schedules will be posted on official social media channels.',
    timeAgo: '4 hours ago',
    filter: 'all'
  },
  {
    id: '7',
    image: 'https://images.unsplash.com/photo-1504870712357-65ea720d6078?w=800&q=80',
    category: 'Community Welfare',
    title: 'Landslide Victim Rehabilitation Program Launched',
    description: 'Government initiates comprehensive rehabilitation program for 300 families displaced by Koslanda landslide. Housing and livelihood support provided.',
    fullContent: 'The Ministry of Disaster Management has launched a comprehensive rehabilitation program for families affected by the recent landslide in the Koslanda area. The program includes: permanent housing construction for 300 families in safe zones, livelihood restoration grants of Rs. 200,000 per family, psychological counseling services for trauma victims, educational support for 450 children including free textbooks and uniforms, and vocational training programs for affected youth. Land has been allocated in three safe locations with proper infrastructure including roads, electricity, and water supply. Construction is expected to be completed within 18 months. Temporary housing with all amenities has been provided during the transition period. The program is funded through a combination of government budget, international aid, and private sector contributions. A dedicated helpline (1919) has been established for affected families. Community leaders are working closely with officials to ensure smooth implementation. Regular progress updates will be shared with the public.',
    timeAgo: '6 hours ago',
    filter: 'all'
  },
  {
    id: '8',
    image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800&q=80',
    category: 'Dam Safety',
    title: 'Randenigala Dam Safety Inspection Completed',
    description: 'Annual comprehensive safety inspection confirms structural integrity. Minor maintenance work scheduled for next quarter.',
    fullContent: 'The Ceylon Electricity Board (CEB) announces successful completion of the annual comprehensive safety inspection of Randenigala Dam. A team of local and international experts conducted thorough assessments including structural integrity analysis, spillway functionality tests, seepage monitoring, and emergency preparedness drills. The inspection confirms that the dam structure is in excellent condition with no major concerns identified. Minor maintenance work including gate mechanism servicing and instrumentation upgrades is scheduled for the next quarter. The dam continues to operate at optimal efficiency, generating clean hydroelectric power while managing flood control responsibilities. Water quality monitoring shows excellent parameters suitable for agricultural and domestic use. The inspection report will be made available to the public through the CEB website. Community awareness programs on dam safety will be conducted in downstream areas. The next major inspection is scheduled for 2026.',
    timeAgo: '8 hours ago',
    filter: 'dam-status'
  },
  {
    id: '9',
    image: 'https://images.unsplash.com/photo-1592210454359-9043f067919b?w=800&q=80',
    category: 'Weather Update',
    title: 'Monsoon Transition: Light Showers Expected Island-wide',
    description: 'Inter-monsoon period brings scattered light showers across the country. No severe weather warnings in effect. Pleasant conditions for outdoor activities.',
    fullContent: 'Sri Lanka is currently experiencing the inter-monsoon transition period, characterized by scattered light showers and generally pleasant weather conditions. The Department of Meteorology reports that most parts of the island can expect brief afternoon or evening showers lasting 30-60 minutes. No severe weather warnings are currently in effect. This is an ideal time for agricultural preparation and outdoor activities. Day temperatures will remain moderate at 28-31°C with comfortable humidity levels. The transition period typically lasts 3-4 weeks before the Southwest Monsoon establishes. Fishermen can safely operate with seas remaining calm to slight. Tourism industry can expect favorable conditions for visitor activities. Farmers are advised to utilize this period for land preparation and planting. The next significant weather system is not expected for at least two weeks. Overall, enjoy the pleasant weather while taking standard precautions during afternoon showers.',
    timeAgo: '12 hours ago',
    filter: 'weather-alerts'
  },
  {
    id: '10',
    image: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800&q=80',
    category: 'Emergency Response',
    title: 'Emergency Preparedness Workshop for Communities',
    description: 'Disaster Management Centre conducts training for 50 community leaders on emergency response, first aid, and disaster preparedness.',
    fullContent: 'The Disaster Management Centre successfully conducted a three-day emergency preparedness workshop for community leaders from high-risk areas. Fifty participants representing various districts received comprehensive training in: disaster risk assessment, early warning system operation, emergency evacuation procedures, first aid and basic life support, community emergency planning, coordination with emergency services, and post-disaster recovery management. The workshop included practical simulations and hands-on training sessions. Participants received emergency response kits and training certificates. They will now serve as resource persons in their communities, conducting awareness programs and organizing mock drills. The DMC plans to train 500 more community leaders over the next year. Training materials have been translated into Sinhala, Tamil, and English. A mobile app for emergency coordination was introduced during the workshop. Success stories from previous disaster responses were shared to inspire participants.',
    timeAgo: '1 day ago',
    filter: 'emergency'
  },
];

export default function NewsScreen() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedNews, setSelectedNews] = useState<typeof newsData[0] | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate API call to fetch latest news
    setTimeout(() => {
      setRefreshing(false);
      // In production, fetch new data here
    }, 1500);
  }, []);

  const handleNewsPress = (news: typeof newsData[0]) => {
    setSelectedNews(news);
    setModalVisible(true);
  };

  const filteredNews = newsData.filter(news => 
    activeFilter === 'all' || news.filter === activeFilter
  );

  return (
    <ScreenLayout 
      title="Latest News" 
      subtitle="Stay informed with live updates on the dam"
    >
      <View className="flex-1 bg-gray-50">
        {/* Filter Tabs */}
        <NewsFilterTabs 
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        {/* News List */}
        <ScrollView 
          className="flex-1 px-4"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#2563eb"
              title="Pull to refresh"
            />
          }
        >
          {filteredNews.map((news) => (
            <NewsCard
              key={news.id}
              {...news}
              onPress={() => handleNewsPress(news)}
            />
          ))}
          
          <View className="h-6" />
        </ScrollView>

        {/* News Detail Modal */}
        <NewsDetailModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          news={selectedNews}
        />
      </View>
    </ScreenLayout>
  );
}