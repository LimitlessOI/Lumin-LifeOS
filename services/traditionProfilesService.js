/**
 * SYNOPSIS: Service module — TraditionProfilesService.
 */
export const getTraditionProfilesDetail = async () => {
  return [
    {
      id: 'catholicism',
      name: 'Catholicism',
      description: 'A major branch of Christianity led by the Pope, emphasizing tradition, sacraments, and the Magesterium.',
      theologicalInterpretations: {
        sacraments: 'Seven sacraments are central to Catholic life, understood as outward signs instituted by Christ to give grace.',
        eucharist: 'Belief in the Real Presence of Christ in the Eucharist (transubstantiation).',
        mary: 'Veneration of the Virgin Mary as Mother of God, with doctrines like the Immaculate Conception and Assumption.',
        saints: 'Veneration of saints as intercessors and examples of Christian life.',
        salvation: 'Salvation is a cooperative process involving grace, faith, and good works.',
        authority: 'Authority resides in Sacred Scripture, Sacred Tradition, and the Magesterium (teaching authority of the Church).',
        priesthood: 'A hierarchical priesthood with apostolic succession, ordained to administer sacraments and lead the faithful.'
      }
    },
    {
      id: 'protestantism-general',
      name: 'Protestantism (General)',
      description: 'A broad movement encompassing various Christian denominations that originated from the Reformation, generally emphasizing "Sola Scriptura" and "Sola Fide".',
      theologicalInterpretations: {
        sacraments: 'Generally fewer sacraments (typically two: Baptism and Communion/Lord\'s Supper), viewed as ordinances or symbols rather than means of grace in the Catholic sense.',
        eucharist: 'Interpretations vary widely, from symbolic remembrance (Zwinglian) to spiritual presence (Calvinist) or consubstantiation (Lutheran).',
        mary: 'Mary is honored as the mother of Jesus, but not venerated; doctrines like the Immaculate Conception and Assumption are generally rejected.',
        saints: 'Saints are seen as exemplary believers, but not intercessors; prayer is directed to God alone.',
        salvation: 'Salvation is generally understood as by grace alone through faith alone (Sola Gratia, Sola Fide).',
        authority: 'Primary authority is Sacred Scripture (Sola Scriptura), interpreted by individual believers and guided by the Holy Spirit.',
        priesthood: 'Belief in the "priesthood of all believers," meaning all baptized Christians have direct access to God and can serve as priests, though many denominations have ordained ministers for leadership and teaching.'
      }
    },
    {
      id: 'eastern-orthodoxy',
      name: 'Eastern Orthodoxy',
      description: 'A collection of autocephalous Christian churches, primarily in Eastern Europe and the Middle East, emphasizing mystical theology, theosis, and the preservation of ancient traditions.',
      theologicalInterpretations: {
        sacraments: 'Referred to as "Mysteries," typically seven, which are understood as channels of divine grace and participation in the divine life.',
        eucharist: 'Belief in the Real Presence of Christ, achieved through the invocation of the Holy Spirit (epiclesis), without defining the exact mechanism (e.g., transubstantiation).',
        mary: 'Veneration of the Theotokos (Mother of God) as truly bearing God, a central figure in Orthodox worship and theology; doctrines like the Immaculate Conception are generally rejected.',
        saints: 'Veneration of saints and icons as windows to heaven and participants in the divine energies; saints are believed to intercede for the living.',
        salvation: 'Salvation is understood as theosis or divinization – a process of becoming more like God through participation in divine grace and energies.',
        authority: 'Authority resides in Sacred Scripture, Sacred Tradition (including the Ecumenical Councils and Church Fathers), and the consensus of the Church.',
        priesthood: 'A hierarchical priesthood with apostolic succession, central to the administration of the Mysteries and the liturgical life of the Church.'
      }
    },
    {
      id: 'islam-sunni',
      name: 'Islam (Sunni)',
      description: 'The largest branch of Islam, emphasizing the Sunnah (practices and teachings of Prophet Muhammad) and the consensus of the community (ijma).',
      theologicalInterpretations: {
        tawhid: 'Absolute monotheism (Tawhid) – the oneness and uniqueness of God (Allah), without partners or equals.',
        prophethood: 'Muhammad is the final prophet in a chain of prophets, whose teachings (Sunnah) are a primary source of guidance.',
        quran: 'The Quran is the literal, uncreated word of God, revealed to Muhammad.',
        hereafter: 'Belief in an afterlife with heaven and hell, and a Day of Judgment where deeds are weighed.',
        pillars: 'Adherence to the Five Pillars of Islam: Shahada (faith), Salat (prayer), Zakat (charity), Sawm (fasting), Hajj (pilgrimage).',
        sharia: 'Islamic law (Sharia) is derived from the Quran and Sunnah, guiding all aspects of life.',
        imamate: 'Leadership (Imamate) is generally understood as a temporal, elected or appointed role, without inherent spiritual infallibility or divine appointment.'
      }
    },
    {
      id: 'islam-shia',
      name: 'Islam (Shia)',
      description: 'The second-largest branch of Islam, primarily revering Ali ibn Abi Talib and the Imams as the rightful successors to Prophet Muhammad.',
      theologicalInterpretations: {
        tawhid: 'Absolute monotheism (Tawhid) – the oneness and uniqueness of God (Allah).',
        prophethood: 'Muhammad is the final prophet. His teachings and the guidance of the Imams are essential.',
        quran: 'The Quran is the literal word of God. Some Shia traditions believe in an esoteric interpretation of the Quran accessible to the Imams.',
        hereafter: 'Belief in an afterlife with heaven and hell, and a Day of Judgment.',
        pillars: 'Similar to Sunni, but often includes additional pillars or different emphasis, such as Walayah (allegiance to the Imams).',
        sharia: 'Islamic law (Sharia) is derived from the Quran, Sunnah, and the teachings of the Imams.',
        imamate: 'Belief in a line of divinely appointed, infallible Imams (descendants of Muhammad through Ali and Fatima) who are the spiritual and temporal successors to the Prophet, possessing esoteric knowledge.'
      }
    },
    {
      id: 'buddhism-theravada',
      name: 'Buddhism (Theravada)',
      description: 'The "Doctrine of the Elders," prominent in Southeast Asia, emphasizing individual enlightenment through monastic practice and adherence to the Pali Canon.',
      theologicalInterpretations: {
        fourNobleTruths: 'Central to understanding suffering (dukkha), its origin, its cessation, and the path to cessation.',
        eightfoldPath: 'The practical path to enlightenment (Nirvana) through right understanding, thought, speech, action, livelihood, effort, mindfulness, and concentration.',
        karma: 'Actions (kamma) have consequences, determining future existences in the cycle of rebirth (samsara).',
        anatta: 'The doctrine of "non-self" or "no-soul" – there is no permanent, unchanging self or essence.',
        nirvana: 'The ultimate goal: the cessation of suffering and the cycle of rebirth, achieved through the eradication of craving, aversion, and ignorance.',
        buddha: 'Siddhartha Gautama is revered as a historical figure who achieved full enlightenment and taught the path, but not as a deity.',
        arhat: 'The ideal is to become an Arhat, one who has achieved individual liberation from suffering.'
      }
    },
    {
      id: 'buddhism-mahayana',
      name: 'Buddhism (Mahayana)',
      description: 'The "Great Vehicle," prominent in East Asia, emphasizing the bodhisattva ideal, compassion, and the potential for all beings to achieve Buddhahood.',
      theologicalInterpretations: {
        fourNobleTruths: 'Accepted, but often contextualized within a broader framework of emptiness (sunyata) and universal compassion.',
        eightfoldPath: 'Practiced, alongside various other skillful means (upaya) to achieve enlightenment.',
        karma: 'Actions (karma) have consequences, but compassion and the transfer of merit can influence outcomes.',
        anatta: 'Accepted, often expanded to include the emptiness (sunyata) of all phenomena – nothing has inherent, independent existence.',
        nirvana: 'The ultimate goal, but often deferred or contextualized within the Bodhisattva Vow to help all sentient beings achieve enlightenment before one\'s own final Nirvana.',
        buddha: 'Siddhartha Gautama is one of many Buddhas; belief in celestial Buddhas and Bodhisattvas who can provide aid and guidance.',
        bodhisattva: 'The ideal is to become a Bodhisattva, one who postpones their own Nirvana to help others achieve enlightenment out of great compassion.'
      }
    },
    {
      id: 'hinduism-vedic',
      name: 'Hinduism (Vedic/Sanatana Dharma)',
      description: 'A diverse group of traditions originating from the Indian subcontinent, characterized by a belief in dharma, karma, samsara, and moksha, with roots in ancient Vedic texts.',
      theologicalInterpretations: {
        brahman: 'The ultimate reality, the absolute, universal spirit, often described as formless, infinite, and all-pervading.',
        atman: 'The individual soul or self, believed to be identical with Brahman (in Advaita Vedanta) or distinct but related (in other schools).',
        deities: 'Worship of a pantheon of gods and goddesses (e.g., Vishnu, Shiva, Devi) who are seen as manifestations or aspects of Brahman.',
        dharma: 'Righteous conduct, moral law, duty, and the natural order of the universe.',
        karma: 'The law of action and consequence, where actions in this life determine one\'s future lives.',
        samsara: 'The cycle of rebirths (reincarnation) through different forms of existence.',
        moksha: 'The ultimate goal: liberation from samsara and the attainment of union with Brahman or realization of one\'s true self.',
        yoga: 'Various paths or disciplines (e.g., Karma Yoga, Jnana Yoga, Bhakti Yoga, Raja Yoga) to achieve spiritual liberation and union with the divine.'
      }
    },
    {
      id: 'judaism-orthodox',
      name: 'Judaism (Orthodox)',
      description: 'The most traditional branch of Judaism, adhering strictly to Halakha (Jewish law) as derived from the Torah and Talmud, believing it to be divinely revealed and immutable.',
      theologicalInterpretations: {
        monotheism: 'Strict monotheism – belief in one, indivisible God, the creator and sustainer of the universe.',
        torah: 'The Torah (both Written and Oral) is God\'s literal word, given to Moses at Mount Sinai, and is eternally binding.',
        covenant: 'God established a covenant with Abraham and the Jewish people, making them a chosen people with specific responsibilities.',
        messiah: 'Belief in the coming of a personal Messiah (Mashiach) who will usher in a messianic era of peace and redemption.',
        halakha: 'Adherence to Halakha (Jewish law) in all aspects of life (dietary laws, Shabbat observance, prayer, etc.) is paramount.',
        resurrection: 'Belief in the resurrection of the dead at the time of the Messiah.',
        synagogue: 'The synagogue is a central place for prayer, study, and community, but the Temple in Jerusalem is seen as the ultimate spiritual center for future rebuilding.'
      }
    },
    {
      id: 'judaism-reform',
      name: 'Judaism (Reform)',
      description: 'A liberal branch of Judaism that emphasizes the evolving nature of Jewish law, ethical monotheism, and individual autonomy, often adapting traditions to modern contexts.',
      theologicalInterpretations: {
        monotheism: 'Belief in one God, with an emphasis on God\'s ethical attributes and the moral imperative for humanity.',
        torah: 'The Torah is divinely inspired, but interpreted as a historical document reflecting human understanding of God\'s will, and is subject to reinterpretation and adaptation.',
        covenant: 'The covenant is seen as an ongoing relationship, emphasizing the Jewish people\'s mission to be a "light unto the nations" through ethical action.',
        messiah: 'Often interpreted as a messianic era of peace and justice, brought about through human action, rather than a single personal Messiah.',
        halakha: 'Halakha is not considered eternally binding; individual Jews have autonomy to choose which laws and traditions to observe based on personal meaning and ethical principles.',
        resurrection: 'Generally rejects the literal resurrection of the dead, focusing instead on the immortality of the soul or the legacy one leaves behind.',
        synagogue: 'The synagogue is a place for worship, learning, and community, adapting practices to be inclusive and relevant to modern life.'
      }
    }
  ];
};

export const fetchDenominationalDetails = async (traditionId) => {
  const profiles = await getTraditionProfilesDetail();
  return profiles.find(p => p.id === traditionId) || null;
};