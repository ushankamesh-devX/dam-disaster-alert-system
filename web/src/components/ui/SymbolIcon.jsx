import WarningRounded from '@mui/icons-material/WarningRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import NotificationsActiveRounded from '@mui/icons-material/NotificationsActiveRounded';
import ConstructionRounded from '@mui/icons-material/ConstructionRounded';
import BarChartRounded from '@mui/icons-material/BarChartRounded';
import NewspaperRounded from '@mui/icons-material/NewspaperRounded';
import VpnKeyRounded from '@mui/icons-material/VpnKeyRounded';
import PeopleRounded from '@mui/icons-material/PeopleRounded';
import WaterRounded from '@mui/icons-material/WaterRounded';
import SensorsRounded from '@mui/icons-material/SensorsRounded';
import MapRounded from '@mui/icons-material/MapRounded';
import SettingsRounded from '@mui/icons-material/SettingsRounded';
import SellRounded from '@mui/icons-material/SellRounded';
import AssignmentRounded from '@mui/icons-material/AssignmentRounded';
import FolderRounded from '@mui/icons-material/FolderRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import StarRounded from '@mui/icons-material/StarRounded';
import ScheduleRounded from '@mui/icons-material/ScheduleRounded';
import VisibilityRounded from '@mui/icons-material/VisibilityRounded';

const icons = { warning: WarningRounded, close: CloseRounded, check: CheckCircleRounded,
  alert: NotificationsActiveRounded, construction: ConstructionRounded, chart: BarChartRounded,
  news: NewspaperRounded, key: VpnKeyRounded, users: PeopleRounded, dam: WaterRounded,
  sensor: SensorsRounded, map: MapRounded, settings: SettingsRounded, tag: SellRounded,
  report: AssignmentRounded, folder: FolderRounded, search: SearchRounded,
  edit: EditRounded, star: StarRounded, clock: ScheduleRounded, view: VisibilityRounded };

// All interface symbols are flat SVGs with one inherited colour.
export default function SymbolIcon({ name, ...props }) {
  const Icon = icons[name] || FolderRounded;
  return <Icon aria-hidden="true" sx={{ fontSize: '1.25em', verticalAlign: 'middle' }} {...props} />;
}
