import { canvasNode, canvasEdge, NODE_COLORS, NodeColor, NodeShape } from "@/types/canvas";

export interface CanvasTemplate {
  id: string;
  name: string;
  description: string;
  nodes: canvasNode[];
  edges: canvasEdge[];
}

// Helper to construct a node cleanly
function createTemplateNode(
  id: string,
  label: string,
  shape: NodeShape,
  colorIndex: number,
  x: number,
  y: number,
  width: number,
  height: number
): canvasNode {
  return {
    id,
    type: "canvasNode",
    position: { x, y },
    width,
    height,
    data: {
      label,
      color: NODE_COLORS[colorIndex] || NODE_COLORS[0],
      shape,
    },
  };
}

// Helper to construct an edge cleanly
function createTemplateEdge(
  id: string,
  source: string,
  target: string,
  label?: string
): canvasEdge {
  return {
    id,
    source,
    target,
    type: "canvasEdge",
    data: {
      label,
    },
  };
}

export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  {
    id: "microservices",
    name: "Microservices Architecture",
    description: "Standard production pattern with API Gateway, independent services, and dedicated databases.",
    nodes: [
      createTemplateNode("client", "Web Client", "circle", 0, 300, 50, 90, 90),
      createTemplateNode("gateway", "API Gateway", "pill", 1, 275, 200, 140, 60),
      createTemplateNode("auth-service", "Auth Service", "pill", 5, 50, 320, 140, 60),
      createTemplateNode("user-service", "User Service", "pill", 2, 275, 320, 140, 60),
      createTemplateNode("order-service", "Order Service", "pill", 3, 500, 320, 140, 60),
      createTemplateNode("user-db", "User DB", "cylinder", 7, 295, 450, 100, 120),
      createTemplateNode("order-db", "Order DB", "cylinder", 7, 520, 450, 100, 120),
    ],
    edges: [
      createTemplateEdge("e-client-gateway", "client", "gateway", "HTTPS"),
      createTemplateEdge("e-gateway-auth", "gateway", "auth-service", "Validate"),
      createTemplateEdge("e-gateway-user", "gateway", "user-service"),
      createTemplateEdge("e-gateway-order", "gateway", "order-service"),
      createTemplateEdge("e-user-db", "user-service", "user-db"),
      createTemplateEdge("e-order-db", "order-service", "order-db"),
    ],
  },
  {
    id: "cicd-pipeline",
    name: "CI/CD Deployment Pipeline",
    description: "Modern automated deployment workflow branching from event commit to multi-stage deployment.",
    nodes: [
      createTemplateNode("git-push", "Git Push", "circle", 6, 50, 165, 90, 90),
      createTemplateNode("build-step", "Build Step", "pill", 1, 220, 180, 140, 60),
      createTemplateNode("unit-tests", "Run Tests", "pill", 2, 430, 180, 140, 60),
      createTemplateNode("approval", "Manual Approval?", "diamond", 3, 640, 150, 120, 120),
      createTemplateNode("staging", "Deploy Staging", "pill", 7, 830, 100, 140, 60),
      createTemplateNode("production", "Deploy Prod", "pill", 4, 830, 260, 140, 60),
    ],
    edges: [
      createTemplateEdge("e-push-build", "git-push", "build-step", "Trigger"),
      createTemplateEdge("e-build-test", "build-step", "unit-tests", "Artifacts"),
      createTemplateEdge("e-test-approve", "unit-tests", "approval", "Success"),
      createTemplateEdge("e-approve-staging", "approval", "staging", "Auto"),
      createTemplateEdge("e-approve-prod", "approval", "production", "Approved"),
    ],
  },
  {
    id: "event-driven",
    name: "Event-Driven System",
    description: "High-throughput asynchronous communication using message brokers and downstream consumers.",
    nodes: [
      createTemplateNode("prod-a", "Web Client App", "rectangle", 1, 50, 80, 150, 80),
      createTemplateNode("prod-b", "IoT Gateway", "rectangle", 1, 50, 260, 150, 80),
      createTemplateNode("broker", "Kafka Broker", "hexagon", 2, 280, 160, 120, 100),
      createTemplateNode("cons-1", "Notification Svc", "pill", 7, 480, 90, 140, 60),
      createTemplateNode("cons-2", "Analytics Svc", "pill", 3, 480, 270, 140, 60),
      createTemplateNode("warehouse", "Data Warehouse", "cylinder", 6, 690, 240, 100, 120),
    ],
    edges: [
      createTemplateEdge("e-proda-broker", "prod-a", "broker", "HTTP Post"),
      createTemplateEdge("e-prodb-broker", "prod-b", "broker", "MQTT"),
      createTemplateEdge("e-broker-cons1", "broker", "cons-1", "Events"),
      createTemplateEdge("e-broker-cons2", "broker", "cons-2", "Telemetry"),
      createTemplateEdge("e-cons2-warehouse", "cons-2", "warehouse", "Persist"),
    ],
  },
];
