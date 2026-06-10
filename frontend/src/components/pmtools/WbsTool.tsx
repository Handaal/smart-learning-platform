import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useI18n } from '@/i18n';
import styles from './WbsTool.module.css';

interface WbsNode {
  id: string;
  label: string;
  children: WbsNode[];
  open: boolean;
}

let wbsCounter = 1;
const newId = () => `wbs-${wbsCounter++}`;

function createNode(label: string): WbsNode {
  return { id: newId(), label, children: [], open: true };
}

function buildInitialTree(t: (key: string, fallback?: string) => string): WbsNode[] {
  return [
    {
      id: 'wbs-root',
      label: t('learner.pmTools.wbs.rootLabel', 'eLearning Module Development'),
      open: true,
      children: [
        {
          id: newId(),
          label: t('learner.pmTools.wbs.phases.analysis', 'Analysis'),
          open: true,
          children: [
            createNode(t('learner.pmTools.wbs.tasks.needsAnalysis', 'Needs analysis')),
            createNode(t('learner.pmTools.wbs.tasks.audienceProfile', 'Audience profile')),
            createNode(t('learner.pmTools.wbs.tasks.contentInventory', 'Content inventory')),
          ],
        },
        {
          id: newId(),
          label: t('learner.pmTools.wbs.phases.design', 'Design'),
          open: true,
          children: [
            createNode(t('learner.pmTools.wbs.tasks.learningObjectives', 'Learning objectives')),
            createNode(t('learner.pmTools.wbs.tasks.storyboard', 'Storyboard')),
            createNode(t('learner.pmTools.wbs.tasks.assessmentBlueprint', 'Assessment blueprint')),
          ],
        },
        {
          id: newId(),
          label: t('learner.pmTools.wbs.phases.development', 'Development'),
          open: true,
          children: [
            createNode(t('learner.pmTools.wbs.tasks.scriptWriting', 'Script writing')),
            createNode(t('learner.pmTools.wbs.tasks.visualAssets', 'Visual assets')),
            createNode(t('learner.pmTools.wbs.tasks.scormPackaging', 'SCORM packaging')),
          ],
        },
        {
          id: newId(),
          label: t('learner.pmTools.wbs.phases.implementation', 'Implementation'),
          open: false,
          children: [
            createNode(t('learner.pmTools.wbs.tasks.lmsUpload', 'LMS upload')),
            createNode(t('learner.pmTools.wbs.tasks.pilotTesting', 'Pilot testing')),
          ],
        },
        {
          id: newId(),
          label: t('learner.pmTools.wbs.phases.evaluation', 'Evaluation'),
          open: false,
          children: [
            createNode(t('learner.pmTools.wbs.tasks.kirkpatrickL1', 'Kirkpatrick L1')),
            createNode(t('learner.pmTools.wbs.tasks.kirkpatrickL2', 'Kirkpatrick L2')),
          ],
        },
      ],
    },
  ];
}

function updateTree(
  nodes: WbsNode[],
  id: string,
  transform: (node: WbsNode) => WbsNode | null,
): WbsNode[] {
  return nodes
    .map((node) => {
      if (node.id === id) return transform(node);
      return { ...node, children: updateTree(node.children, id, transform) };
    })
    .filter(Boolean) as WbsNode[];
}

function addChild(nodes: WbsNode[], parentId: string, label: string): WbsNode[] {
  return nodes.map((node) => {
    if (node.id === parentId) {
      return { ...node, open: true, children: [...node.children, createNode(label)] };
    }
    return { ...node, children: addChild(node.children, parentId, label) };
  });
}

type RowProps = {
  node: WbsNode;
  depth: number;
  addChildLabel: string;
  deleteLabel: string;
  addChildTitle: string;
  onChange: (id: string, value: string) => void;
  onAdd: (parentId: string) => void;
  onDelete: (id: string) => void;
};

function NodeRow({
  node,
  depth,
  addChildLabel,
  deleteLabel,
  addChildTitle,
  onChange,
  onAdd,
  onDelete,
}: RowProps) {
  const [editing, setEditing] = useState(false);

  return (
    <div className={styles.nodeWrapper} style={{ paddingInlineStart: depth * 20 }}>
      <div className={`${styles.nodeRow} ${depth === 0 ? styles.rootRow : ''}`}>
        <button
          type="button"
          className={styles.toggle}
          onClick={() => onChange(node.id, '__toggle__')}
          aria-label={node.open ? 'Collapse node' : 'Expand node'}
        >
          {node.children.length > 0 ? node.open ? <ChevronDown size={14} /> : <ChevronRight size={14} /> : <span style={{ width: 14 }} />}
        </button>

        {editing ? (
          <input
            className={styles.nodeInput}
            autoFocus
            defaultValue={node.label}
            onBlur={(event) => {
              onChange(node.id, event.target.value);
              setEditing(false);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                (event.target as HTMLInputElement).blur();
              }
            }}
          />
        ) : (
          <span className={styles.nodeLabel} onDoubleClick={() => setEditing(true)}>
            {node.label}
          </span>
        )}

        <div className={styles.nodeActions}>
          <button type="button" className={styles.iconBtn} title={addChildTitle} aria-label={addChildLabel} onClick={() => onAdd(node.id)}>
            <Plus size={12} />
          </button>
          {depth > 0 ? (
            <button type="button" className={styles.iconBtn} title={deleteLabel} aria-label={deleteLabel} onClick={() => onDelete(node.id)}>
              <Trash2 size={12} />
            </button>
          ) : null}
        </div>
      </div>

      {node.open
        ? node.children.map((child) => (
            <NodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              addChildLabel={addChildLabel}
              deleteLabel={deleteLabel}
              addChildTitle={addChildTitle}
              onChange={onChange}
              onAdd={onAdd}
              onDelete={onDelete}
            />
          ))
        : null}
    </div>
  );
}

export interface WbsToolProps {
  onExport?: (tree: WbsNode[]) => void;
}

export default function WbsTool({ onExport }: WbsToolProps) {
  const { t } = useI18n();
  const [tree, setTree] = useState<WbsNode[]>(() => buildInitialTree(t));

  const addChildLabel = t('learner.pmTools.wbs.actions.addChildLabel', 'Add child task');
  const addChildTitle = t('learner.pmTools.wbs.actions.addChildTitle', 'Add child task');
  const deleteLabel = t('learner.pmTools.wbs.actions.delete', 'Delete');
  const exportLabel = t('learner.pmTools.wbs.actions.export', 'Export WBS');
  const hint = t('learner.pmTools.wbs.hint', 'Double-click to edit - Click + to add child task');
  const defaultTask = t('learner.pmTools.wbs.defaultTask', 'New task');

  function handleChange(id: string, value: string) {
    if (value === '__toggle__') {
      setTree((current) => updateTree(current, id, (node) => ({ ...node, open: !node.open })));
      return;
    }
    setTree((current) => updateTree(current, id, (node) => ({ ...node, label: value })));
  }

  function handleAdd(parentId: string) {
    setTree((current) => addChild(current, parentId, defaultTask));
  }

  function handleDelete(id: string) {
    setTree((current) => updateTree(current, id, () => null));
  }

  const rows = useMemo(() => tree, [tree]);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h3 className={styles.title}>{t('learner.pmTools.tabs.wbs', 'Work Breakdown Structure')}</h3>
        <div className={styles.headerActions}>
          <span className={styles.hint}>{hint}</span>
          {onExport ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => onExport(rows)}>
              {exportLabel}
            </button>
          ) : null}
        </div>
      </div>

      <div className={styles.tree}>
        {rows.map((node) => (
          <NodeRow
            key={node.id}
            node={node}
            depth={0}
            addChildLabel={addChildLabel}
            deleteLabel={deleteLabel}
            addChildTitle={addChildTitle}
            onChange={handleChange}
            onAdd={handleAdd}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
