import { Guideline } from '@/models/guideline';

export const mockGuidelines: Guideline[] = [
  {
    id: 'g-evac-01',
    title: 'Evacuate low-lying areas',
    description: 'Move to higher ground immediately when alerts are issued.',
    steps: [
      'Turn off electricity and gas if safe to do so.',
      'Carry essential documents and emergency kit.',
      'Follow marked evacuation routes.',
    ],
    severity: 'high',
  },
  {
    id: 'g-evac-02',
    title: 'Avoid river crossings',
    description: 'Do not attempt to cross flooded roads or bridges.',
    steps: [
      'Use alternative routes suggested by authorities.',
      'Keep children and pets away from water flow.',
    ],
    severity: 'medium',
  },
  {
    id: 'g-evac-03',
    title: 'Stay informed',
    description: 'Monitor official updates and hazard map alerts.',
    steps: [
      'Check the app every 15–30 minutes during emergencies.',
      'Keep phone charged and enable notifications.',
    ],
    severity: 'low',
  },
];
