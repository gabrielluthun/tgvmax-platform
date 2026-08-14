import { ShieldAlert, Github, ExternalLink } from "lucide-react";

const GITHUB_REPO_URL = "https://github.com/gabrielluthun/tgvmax-platform";
const REPORT_CONNECTION_LIMIT_URL = `${GITHUB_REPO_URL}/blob/main/doc/rapport-limite-correspondances.md`;

const PAGE_TITLE =
  "text-3xl sm:text-4xl font-bold text-[#0A2540] dark:text-slate-100 tracking-tight";
const SECTION_HEADING =
  "text-3xl font-bold text-[#0A2540] dark:text-slate-100";
const SUBSECTION_HEADING =
  "text-lg font-bold text-[#0A2540] dark:text-slate-100";
const GROUP_HEADING =
  "text-base font-bold text-[#0A2540] dark:text-slate-100";
const EMPHASIS = "text-slate-800 dark:text-slate-200";
const LINK =
  "underline text-slate-800 dark:text-slate-200 hover:text-[#0A2540] dark:hover:text-slate-100";
const STEP_TITLE = `block font-bold mb-1.5 ${EMPHASIS}`;
const BORDER_BLOCK =
  "border-l-2 border-[#0A2540]/25 dark:border-slate-600 pl-5";
const BULLET_LIST =
  "mt-3 space-y-2.5 list-disc pl-5 marker:text-[#0A2540]/60 dark:marker:text-slate-500";
const SECTION_SPACING = "mt-10 scroll-mt-28";

const PAGE_SECTIONS = [
  { id: "about-le-projet", label: "Le projet", testId: "about-section-projet" },
  { id: "about-comment", label: "Comment ça marche", testId: "about-section-comment-ca-marche" },
  { id: "about-filtres", label: "Les filtres", testId: "about-section-filtres" },
  { id: "about-sync", label: "Synchronisation", testId: "about-section-sync" },
  { id: "about-donnees", label: "Les données", testId: "about-section-donnees" },
  { id: "about-avertissement", label: "Avertissement", testId: "about-section-avertissement" },
  { id: "about-contact", label: "Contact", testId: "about-section-contact" },
];

const ABOUT_FILTER_SECTIONS = [
  {
    title: "Filtres simples",
    intro:
      "Section ouverte par défaut dans le panneau latéral (ou la feuille mobile). Une seule section (simple ou avancée) peut être dépliée à la fois.",
    filters: [
      {
        name: "Type de train",
        effect: "TGV INOUI / OUIGO, Intercités, Intercités de nuit.",
      },
      {
        name: "Correspondances max",
        effect:
          "Direct (défaut) : trajets sans changement de train | 1 correspondance : inclut les parcours composés avec une correspondance (2 trains au total).",
      },
    ],
  },
  {
    title: "Filtres avancés",
    intro:
      "Section repliée par défaut ; elle s'ouvre automatiquement si un filtre avancé (hors horizon à 30 j) est actif.",
    filters: [
      {
        name: "Horizon de dates",
        effect:
          "Limite l'affichage aux 7, 14 ou 30 prochains jours (défaut : 30 j). Réduit le volume de résultats sans changer la base indexée.",
      },
      {
        name: "Créneaux horaires",
        effect:
          "Matin (avant 12 h), après-midi (12 h–18 h), soir (à partir de 18 h).",
      },
      {
        name: "Durée totale max",
        effect:
          "Porte à porte (trajet + attentes en gare) : ≤ 3 h, 5 h ou 8 h. Utile pour les allers-retours à la journée, y compris avec correspondance.",
      },
      {
        name: "Départ aujourd'hui",
        effect:
          "Ne conserve que les trajets dont la date de départ est aujourd'hui (fuseau Europe/Paris). Les départs déjà passés sont toujours exclus.",
      },
      {
        name: "Week-end uniquement",
        effect: "Samedis et dimanches seulement.",
      },
    ],
  },
  {
    title: "Actions",
    filters: [
      {
        name: "Masquer une destination",
        effect:
          "Retire une ville de vos résultats (stockage local). Réversible via « Réafficher tout » dans le panneau filtres.",
      },
    ],
  },
];

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function AboutToc() {
  return (
    <nav
      aria-label="Sommaire de la page"
      className="mt-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden"
      data-testid="about-toc"
    >
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40">
        <p className={`m-0 ${SUBSECTION_HEADING}`}>Sommaire</p>
        <p className="m-0 mt-1 text-sm text-slate-500 dark:text-slate-400">
          {PAGE_SECTIONS.length} sections
        </p>
      </div>
      <ol className="list-none p-2 m-0 divide-y divide-slate-100 dark:divide-slate-800">
        {PAGE_SECTIONS.map(({ id, label }, index) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => scrollToSection(id)}
              className="group w-full flex items-center gap-3 rounded-lg px-3 py-3 text-left text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-0 bg-transparent cursor-pointer"
            >
              <span className="shrink-0 w-7 font-mono text-xs font-bold text-[#0A2540]/45 dark:text-slate-500 tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#0A2540] dark:group-hover:text-slate-100">
                {label}
              </span>
              <span
                className="shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-[#0A2540]/60 dark:group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all"
                aria-hidden
              >
                →
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function AboutSection({ id, title, testId, children }) {
  return (
    <section id={id} className={SECTION_SPACING} data-testid={testId}>
      <h2 className={SECTION_HEADING}>{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function BorderBlock({ children, className = "", ...props }) {
  return (
    <div className={`${BORDER_BLOCK} ${className}`} {...props}>
      {children}
    </div>
  );
}

function FiltersReference({ sections }) {
  return (
    <div className="space-y-8" role="region" aria-label="Détail des filtres">
      {sections.map((section) => (
        <BorderBlock key={section.title}>
          <h3 className={GROUP_HEADING}>{section.title}</h3>
          {section.intro ? (
            <p className="mt-2 leading-relaxed">{section.intro}</p>
          ) : null}
          <ul className={BULLET_LIST}>
            {section.filters.map((row) => (
              <li key={row.name} className="leading-relaxed">
                <strong className={EMPHASIS}>{row.name}</strong>
                {" : "}
                {row.effect}
              </li>
            ))}
          </ul>
        </BorderBlock>
      ))}
    </div>
  );
}

function SubscriptionPlan({ id, title, href, items }) {
  return (
    <BorderBlock aria-labelledby={id}>
      <h4 id={id} className={GROUP_HEADING}>
        <a href={href} target="_blank" rel="noopener noreferrer" className={LINK}>
          {title}
        </a>
      </h4>
      <ul className={`${BULLET_LIST} mt-2`}>
        {items.map(({ label, text }) => (
          <li key={label}>
            <strong className={EMPHASIS}>{label}</strong>
            {" : "}
            {text}
          </li>
        ))}
      </ul>
    </BorderBlock>
  );
}

export default function About() {
  return (
    <main
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-16 text-base text-slate-600 dark:text-slate-400 leading-relaxed"
      data-testid="about-page"
    >
      <h1 className={PAGE_TITLE}>À propos</h1>

      <AboutToc />

      <AboutSection id="about-le-projet" title="Le projet" testId="about-section-projet">
        <p>
          <strong className={EMPHASIS}>MaxTracker</strong> aide les titulaires d&apos;un abonnement{" "}
          <strong className={EMPHASIS}>MAX Jeune ou MAX Senior</strong> à repérer plus vite les trajets
          éligibles à <strong className={EMPHASIS}>0 €</strong> sur les{" "}
          <strong className={EMPHASIS}>30 prochains jours</strong>, depuis la gare de leur choix, en
          direct ou avec correspondance.
        </p>
        <p>
          L&apos;outil agrège et filtre les disponibilités publiées dans les données ouvertes SNCF,
          compose des parcours multi-segments lorsque les horaires s&apos;enchaînent, puis vous oriente
          vers{" "}
          <a href="https://www.sncf-connect.com" target="_blank" rel="noopener noreferrer" className={LINK}>
            SNCF Connect
          </a>{" "}
          pour réserver. C&apos;est un{" "}
          <strong className={EMPHASIS}>outil d&apos;optimisation de recherche</strong>, pas un canal de
          vente.
        </p>
        <p>
          MaxTracker est <strong className={EMPHASIS}>gratuit</strong>,{" "}
          <strong className={EMPHASIS}>indépendant et non affilié à la SNCF</strong>. Il ne vend pas de
          billets, ne collecte aucun identifiant SNCF Connect et ne réalise aucune réservation.
        </p>

        <div data-testid="about-subscriptions">
          <h3 className={SUBSECTION_HEADING}>Les abonnements concernés</h3>
          <p>
            MaxTracker ne vend pas d&apos;abonnement ni de billets de train. Il aide à repérer les
            créneaux à <strong className={EMPHASIS}>0 €</strong> réservables avec un forfait déjà
            souscrit sur SNCF Connect. Les modalités ci-dessous sont un résumé ; seules les{" "}
            <a
              href="https://www.sncf-connect.com/aide/les-abonnements-sncf"
              target="_blank"
              rel="noopener noreferrer"
              className={LINK}
            >
              conditions officielles SNCF
            </a>{" "}
            font foi (tarifs et règles susceptibles d&apos;évoluer). <br/><br/>
          </p>

          <div className="space-y-4">
            <SubscriptionPlan
              id="about-max-jeune"
              title="MAX Jeune"
              href="https://www.sncf-connect.com/catalogue/description/max-jeune"
              items={[
                {
                  label: "Public",
                  text: "16 à 27 ans (valable jusqu'au dernier jour du mois des 27 ans).",
                },
                { label: "Tarif", text: "79 € par mois." },
                {
                  label: "Engagement",
                  text: "contrat de 12 mois, engagement minimum de 3 mois ; résiliation possible ensuite (frais de 15 € selon conditions) ; gratuite au-delà des 12 premiers mois.",
                },
                {
                  label: "Billets à 0 €",
                  text: "réservation obligatoire à partir de J−30, en 2e classe, sur une sélection de TGV INOUI, OUIGO grande vitesse et Intercités à réservation obligatoire, hors périodes de forte affluence et dans la limite des places allouées aux abonnés.",
                },
                {
                  label: "Autre avantage",
                  text: "−30 % sur d'autres trajets éligibles (hors billets à 0 €).",
                },
              ]}
            />
            <SubscriptionPlan
              id="about-max-senior"
              title="MAX Senior"
              href="https://www.sncf-connect.com/catalogue/description/max-senior"
              items={[
                { label: "Public", text: "60 ans et plus." },
                { label: "Tarif", text: "79 € par mois." },
                {
                  label: "Engagement",
                  text: "mêmes principes que MAX Jeune (12 mois, 3 mois minimum, frais de résiliation de 15 € selon conditions, résiliation gratuite au-delà de 12 mois).",
                },
                {
                  label: "Billets à 0 €",
                  text: "même logique de réservation à J−30 en 2e classe, mais trajets en semaine (lundi–vendredi) hors périodes de forte affluence, conditions plus restrictives que MAX Jeune le week-end.",
                },
                {
                  label: "Autre avantage",
                  text: "−30 % sur d'autres trajets éligibles (hors billets à 0 €).",
                },
              ]}
            />
          </div>

          <p>
            Entre 28 et 59 ans, la SNCF ne propose pas d&apos;abonnement MAX : seuls les titulaires de
            MAX Jeune ou MAX Senior peuvent réserver les créneaux à 0 € repérés ici.
          </p>
        </div>
      </AboutSection>

      <AboutSection
        id="about-comment"
        title="Comment ça marche"
        testId="about-section-comment-ca-marche"
      >
        <p>
          MaxTracker part d&apos;une seule question :{" "}
          <em>« Quels trajets TGV Max à 0 € puis-je prendre depuis ma gare dans le mois qui vient ? »</em>{" "}
          Voici le parcours, de la saisie de la gare jusqu&apos;à la réservation sur le canal officiel.
        </p>

        <ol className="space-y-5 list-decimal list-outside ml-5 marker:font-bold marker:text-[#0A2540] dark:marker:text-slate-300">
          <li className="pl-1">
            <strong className={STEP_TITLE}>Choisissez votre gare de départ</strong>
            <p className="m-0 mt-1.5">
              L&apos;autocomplétion se déclenche à partir de 3 lettres. Vous pouvez enregistrer des gares
              en favoris (stockées localement) pour relancer une recherche en un clic.
            </p>
          </li>
          <li className="pl-1">
            <strong className={STEP_TITLE}>Lancez la recherche</strong>
            <p className="m-0 mt-1.5">
              MaxTracker interroge sa base, alimentée par les données ouvertes SNCF, et affiche les
              trajets éligibles depuis cette gare. Si la gare n&apos;est pas desservie par l&apos;offre TGV
              Max, un message vous l&apos;indique ; s&apos;il n&apos;y a aucun créneau à 0 € pour
              l&apos;instant, l&apos;app vous invite à réessayer après la prochaine mise à jour.
            </p>
          </li>
          <li className="pl-1">
            <strong className={STEP_TITLE}>Explorez les destinations</strong>
            <p className="m-0 mt-1.5">
              Les résultats sont regroupés par ville d&apos;arrivée et par date. Chaque{" "}
              <strong className={EMPHASIS}>trajet direct</strong> affiche date, heure, type de train et
              un lien SNCF Connect. Les <strong className={EMPHASIS}>parcours avec correspondance</strong>{" "}
              listent chaque segment avec un lien de réservation par train. Le badge{" "}
              <strong className={EMPHASIS}>« Départ possible aujourd&apos;hui »</strong> signale un départ
              le jour même ; le badge <strong className={EMPHASIS}>« Imminent »</strong> un départ dans
              moins de 4 heures.
            </p>
          </li>
          <li className="pl-1">
            <strong className={STEP_TITLE}>Affinez avec les filtres</strong>
            <p className="m-0 mt-1.5">
              Le panneau à gauche (ou la feuille filtres sur mobile) propose des{" "}
              <strong className={EMPHASIS}>Filtres simples</strong> et{" "}
              <strong className={EMPHASIS}>Filtres avancés</strong>, repliables. Le détail figure dans
              la section <button type="button" onClick={() => scrollToSection("about-filtres")} className={`${LINK} bg-transparent border-0 p-0 cursor-pointer font-bold`}>Les filtres</button>.
            </p>
          </li>
          <li className="pl-1">
            <strong className={STEP_TITLE}>Changez de vue selon votre besoin</strong>
            <p className="m-0 mt-1.5">
              La vue <strong className={EMPHASIS}>Liste</strong> compare les destinations ; le{" "}
              <strong className={EMPHASIS}>Calendrier</strong> compte les départs par jour sur 30 jours ;
              le graphique <strong className={EMPHASIS}>Pics horaires</strong> met en évidence les heures
              les plus fournies.
            </p>
          </li>
          <li className="pl-1">
            <strong className={STEP_TITLE}>Personnalisez l&apos;affichage</strong>
            <p className="m-0 mt-1.5">
              L&apos;icône soleil / lune dans le header bascule entre mode clair et mode sombre. La
              préférence est mémorisée dans votre navigateur (<code className="text-xs">mt_theme</code>
              ).
            </p>
          </li>
          <li className="pl-1">
            <strong className={STEP_TITLE}>Réservez sur SNCF Connect</strong>
            <p className="m-0 mt-1.5">
              MaxTracker ne finalise jamais la vente : chaque train ouvre SNCF Connect pour confirmer que
              le billet est encore disponible et à 0 € selon votre abonnement. Sur un parcours avec
              correspondance, <strong className={EMPHASIS}>chaque segment</strong> possède son propre lien
              : vous devez réserver chaque tronçon éligible séparément.
            </p>
          </li>
        </ol>


          <p>
              <strong className={EMPHASIS}>Pourquoi une seule correspondance ?</strong> Le moteur peut
              composer des parcours jusqu&apos;à deux correspondances (soit trois trains), mais cette
              profondeur n&apos;est pas proposée dans l&apos;interface pour des raisons techniques. <br/> 
              Vous pouvez consulter le {" "}
              <a href={REPORT_CONNECTION_LIMIT_URL} target="_blank" rel="noopener noreferrer" className={LINK}>
                rapport de limitation
              </a>{" "}
              pour plus de détails techniques.
          </p>
      </AboutSection>

      <AboutSection id="about-filtres" title="Les filtres" testId="about-section-filtres">
        <p>
          Le panneau filtres reprend la même logique que l&apos;application : sections repliables, une
          seule ouverte à la fois entre simple et avancé.
        </p>
        <div data-testid="about-filters-table">
          <FiltersReference sections={ABOUT_FILTER_SECTIONS} />
        </div>
        <p>
          Le badge <strong className={EMPHASIS}>« Départ possible aujourd&apos;hui »</strong> sur une
          destination reprend la même logique que le filtre homonyme.
        </p>
        <BorderBlock>
          <p className="m-0">
            <strong className={EMPHASIS}>Fenêtre de 30 jours.</strong> Seuls les départs des 30 prochains
            jours sont indexés : c&apos;est la période couverte par l&apos;offre TGV Max et par le jeu de
            données utilisé. Le filtre <em>Horizon de dates</em> restreint cette plage côté interface. Un
            train affiché ici est <strong className={EMPHASIS}>éligible selon l&apos;open data</strong>,
            pas une garantie de place encore libre au moment où vous réservez.
          </p>
        </BorderBlock>
      </AboutSection>

      <AboutSection id="about-sync" title="Synchronisation" testId="about-section-sync">
        <p>
          Le header affiche la dernière publication des{" "}
          <strong className={EMPHASIS}>données SNCF</strong> et la dernière{" "}
          <strong className={EMPHASIS}>sync MaxTracker</strong> (toutes les 15 minutes). <br />
          La synchronisation concorde les horaires à l&apos;heure réelle : les départs déjà passés
          ne s&apos;affichent plus. Un bouton permet de forcer un nouvel import SNCF.
        </p>
        <p>
          Ce n&apos;est pas du temps réel : un billet peut être réservé entre deux rafraîchissements. Pour
          la source, les licences et les écarts possibles avec SNCF Connect.
        </p>
      </AboutSection>

      <AboutSection id="about-donnees" title="Les données" testId="about-section-donnees">
        <p>
          Les trajets affichés proviennent du jeu de données ouvert{" "}
          <a
            href="https://data.sncf.com/explore/dataset/tgvmax/"
            target="_blank"
            rel="noopener noreferrer"
            className={LINK}
          >
            « Disponibilités TGV Max »
          </a>
          , publié par <strong className={EMPHASIS}>SNCF Voyageurs</strong> sur la plateforme
          Opendatasoft, sous la licence indiquée sur le portail open data.
        </p>
        <p>
          Il s&apos;agit d&apos;un <strong className={EMPHASIS}>instantané national</strong> des créneaux
          encore éligibles à la réservation MAX, un segment par ligne, pas d&apos;un stock temps réel
          train par train. Le compteur affiché sur l&apos;écran Recherche (ex. « X trajets éligibles
          suivis en France ») reflète l&apos;ensemble de la base indexée, pas uniquement votre dernière
          recherche.
        </p>

        <BorderBlock>
          <ul className={`${BULLET_LIST} mt-0`}>
            <li>
              <strong className={EMPHASIS}>Données SNCF</strong> : publication d&apos;une nouvelle vague
              chaque jour en début de matinée (aux alentours de 6 h 30). Ce n&apos;est pas une mise à jour
              minute par minute.
            </li>
            <li>
              <strong className={EMPHASIS}>Sync MaxTracker</strong> : toutes les 15 minutes. La
              « dernière sync » du header est ce contrôle. Les départs déjà passés sont masqués.
            </li>
          </ul>
        </BorderBlock>

        <BorderBlock className="border-l-amber-500/70 dark:border-amber-600">
          <p className="m-0 text-amber-950 dark:text-amber-200">
            L&apos;application officielle s&apos;appuie sur des systèmes privés (stock et tarifs en temps réel). <br /> MaxTracker
            n&apos;utilise que le flux public : un train listé ici peut ne plus être disponible sur
            SNCF Connect, et inversement.{" "} <br />
            <strong className={EMPHASIS}>
              Vérifiez toujours sur SNCF Connect avant tout déplacement.
            </strong>
          </p>
        </BorderBlock>

        <p>
          Les places se libèrent aussi par vagues côté SNCF : l&apos;absence de résultat aujourd&apos;hui ne signifie pas qu&apos;il n&apos;y en
          aura pas demain.
        </p>
      </AboutSection>

      <AboutSection id="about-avertissement" title="Avertissement" testId="about-section-avertissement">
        <BorderBlock className="border-l-slate-400 dark:border-slate-500">
          <div className="flex items-start gap-3">
            <ShieldAlert
              className="h-5 w-5 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5"
              aria-hidden
            />
            <div className="space-y-3 min-w-0">
              <p className="m-0">
                <strong className={EMPHASIS}>Service indépendant et non officiel.</strong> MaxTracker
                n&apos;est pas affilié à la SNCF ni à SNCF Voyageurs. « SNCF », « TGV », « TGV Max », « MAX
                JEUNE », « MAX SENIOR » et « SNCF Connect » sont des marques déposées de leurs propriétaires
                respectifs.
              </p>
              <p className="m-0">
                MaxTracker est un outil de repérage fondé sur des données ouvertes. Il ne vend pas de
                billet, ne collecte aucun identifiant SNCF Connect, n&apos;effectue aucune transaction et
                ne garantit ni la disponibilité ni le tarif affiché sur les canaux officiels.
              </p>
              <p className="m-0">
                L&apos;utilisation du jeu de données SNCF est soumise aux conditions du{" "}
                <a href="https://data.sncf.com/" target="_blank" rel="noopener noreferrer" className={LINK}>
                  portail open data
                </a>
                . Les informations présentées sur ce site ne constituent pas un conseil de voyage ni une
                offre commerciale de transport.
              </p>
              <p className={`m-0 font-bold ${EMPHASIS}`}>
                Vérifiez systématiquement la disponibilité réelle et les conditions de votre abonnement
                sur SNCF Connect avant tout déplacement ou achat.
              </p>
            </div>
          </div>
        </BorderBlock>
      </AboutSection>

      <AboutSection id="about-contact" title="Contact" testId="about-section-contact">
        <BorderBlock>
          <p className="m-0">
            MaxTracker est un projet ouvert. Pour consulter le code source, signaler un bug ou proposer
            une amélioration, rendez-vous sur le dépôt GitHub.
          </p>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 font-bold text-[#0A2540] dark:text-slate-100 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            data-testid="about-github-link"
          >
            <Github className="h-5 w-5 shrink-0" aria-hidden />
            <span>GitHub</span>
            <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          </a>
          <p className="mt-4 mb-0">
            Les retours se font via les issues GitHub du dépôt. Il n&apos;y a pas de support commercial
            ni de lien avec la SNCF pour les disponibilités ou les réservations.
          </p>
        </BorderBlock>
      </AboutSection>
    </main>
  );
}
